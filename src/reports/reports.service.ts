import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { Report, ReportDocument } from "./schema/report.schema";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import { User, UserDocument } from "src/users/schema/users.schema";
import { EmailService } from "src/common/email-service/email-service";
import { NotificationsService } from "src/notifications/notifications.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  private async generateNextCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "reportCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `REP-${String(counter.seq).padStart(6, "0")}`;
  }

  private async requireOwnOpenReport(
    id: string,
    reporterId: string,
  ): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException("Report not found");
    const report = await this.reportModel.findById(id);
    if (!report) throw new NotFoundException("Report not found");
    if (report.reporterId.toString() !== reporterId) {
      throw new ForbiddenException("You can only manage your own reports");
    }
    if (report.status !== "open") {
      throw new BadRequestException(
        "This report has already been closed and can no longer be edited",
      );
    }
    return report;
  }

  private async requireReport(id: string): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException("Report not found");
    const report = await this.reportModel.findById(id);
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  /** Best-effort title lookup for the "reported X" line in the admin notification email —
   *  matches the aggregation's four-way entity resolution but as a single-row lookup instead of
   *  a pipeline, since this only runs once per created report. */
  private async resolveEntityTitle(
    entityId: Types.ObjectId,
    entityType: string,
  ): Promise<string> {
    const collection =
      entityType === "shop"
        ? "shops"
        : entityType === "product"
          ? "products"
          : "services";
    const doc = await this.reportModel.db
      .collection(collection)
      .findOne({ _id: entityId }, { projection: { title: 1 } });
    return (doc?.title as string) ?? "an item";
  }

  async createReport(reporterId: string, dto: CreateReportDto) {
    const reportCode = await this.generateNextCode();
    const report = await this.reportModel.create({
      reportCode,
      reporterId: new Types.ObjectId(reporterId),
      entityId: new Types.ObjectId(dto.entityId),
      entityType: dto.entityType,
      reason: dto.reason,
      details: dto.details,
      status: "open",
    });

    this.sendReportSideEffects(report).catch((err) =>
      console.error(
        `Report notification side-effects for ${report.reportCode} failed:`,
        err,
      ),
    );

    return {
      message: this.i18n.translate("auth.reports.created_success", {
        lang: this.lang,
      }),
      data: { report },
    };
  }

  /** Fire-and-forget: report creation must succeed even if email sending is slow/down. */
  private async sendReportSideEffects(report: ReportDocument) {
    const [reporter, entityTitle] = await Promise.all([
      this.userModel.findById(report.reporterId).select("name email"),
      this.resolveEntityTitle(report.entityId, report.entityType),
    ]);

    if (reporter?.email) {
      this.sendReportSubmittedEmail(reporter.email, report.reportCode ?? "");
    }

    await this.notifyReportToAdmins(
      report,
      entityTitle,
      reporter?.name ?? "A user",
      reporter?.email ?? "",
    );
  }

  private sendReportSubmittedEmail(email: string, reportCode: string) {
    const html = `
      <h2>Your report has been submitted</h2>
      <p>Thanks for letting us know. Our team will review your report (${reportCode}) and take
      appropriate action.</p>
      <p>You can track its status any time from your Profile → My Reports page.</p>
    `;
    this.emailService
      .sendEmail(email, `Your report has been submitted (${reportCode})`, html)
      .catch((err) =>
        console.error(`Report-submitted email to ${email} failed:`, err),
      );
  }

  /** Notifies exactly the set of admins who can actually access the Reports page —
   *  super_admin (always allowed) plus any admin/moderator with the "reports" permission
   *  entry — mirroring PermissionsGuard's own bypass rule. */
  private async notifyReportToAdmins(
    report: ReportDocument,
    entityTitle: string,
    reporterName: string,
    reporterEmail: string,
  ) {
    const recipients = await this.userModel
      .find({
        isDisabled: { $ne: true },
        $or: [
          { roles: "super_admin" },
          {
            roles: { $in: ["admin", "moderator"] },
            permissions: { $elemMatch: { page: "reports" } },
          },
        ],
      })
      .select("name email");

    const reportsUrl = `${process.env.ADMIN_PANEL_URL}/admin/reports`;
    const html = `
      <h2>New report submitted</h2>
      <p><strong>${reporterName}</strong> (${reporterEmail}) reported a <strong>${report.entityType}</strong>:
      "${entityTitle}".</p>
      <p><strong>Reason:</strong> ${report.reason}</p>
      <p><strong>Details:</strong> ${report.details}</p>
      <p><a href="${reportsUrl}">${reportsUrl}</a></p>
    `;

    for (const admin of recipients) {
      if (!admin.email) continue;
      this.emailService
        .sendEmail(
          admin.email,
          `New report (${report.reportCode}): ${report.entityType} — ${report.reason}`,
          html,
        )
        .catch((err) =>
          console.error(
            `Report-notification email to ${admin.email} failed:`,
            err,
          ),
        );
    }
  }

  async getMyReports(reporterId: string, page = 1, limit = 10) {
    const filter = { reporterId: new Types.ObjectId(reporterId) };
    const [reports, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reportModel.countDocuments(filter),
    ]);
    return {
      data: {
        reports,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOwnReport(reporterId: string, id: string, dto: UpdateReportDto) {
    const report = await this.requireOwnOpenReport(id, reporterId);
    if (dto.reason !== undefined) report.reason = dto.reason;
    if (dto.details !== undefined) report.details = dto.details;
    await report.save();
    return {
      message: this.i18n.translate("auth.reports.updated_success", {
        lang: this.lang,
      }),
      data: { report },
    };
  }

  async deleteOwnReport(reporterId: string, id: string) {
    const report = await this.requireOwnOpenReport(id, reporterId);
    await report.deleteOne();
    return {
      message: this.i18n.translate("auth.reports.deleted_success", {
        lang: this.lang,
      }),
    };
  }

  /** Paginated/filterable/searchable list for the admin Reports page. Reporter + reported-entity
   *  title joined in via $lookup across users/shops/products/services — same aggregation shape
   *  as reviews.service.ts's getAllReviewsForAdmin, extended to four possible target collections
   *  (shop/product/service/user) instead of Reviews' two (product/service). */
  async getAllReportsForAdmin(
    page = 1,
    limit = 20,
    entityType?: "shop" | "product" | "service" | "user",
    status?: "open" | "closed",
    reason?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const match: Record<string, unknown> = {};
    if (entityType) match.entityType = entityType;
    if (status) match.status = status;
    if (reason) match.reason = reason;
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.$lte = endOfDay;
      }
      match.createdAt = createdAt;
    }

    const basePipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "reporterId",
          foreignField: "_id",
          as: "reporter",
        },
      },
      { $unwind: { path: "$reporter", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "shops",
          localField: "entityId",
          foreignField: "_id",
          as: "shopInfo",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "entityId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "entityId",
          foreignField: "_id",
          as: "serviceInfo",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "entityId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $addFields: {
          entityTitle: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$entityType", "shop"] },
                  then: { $arrayElemAt: ["$shopInfo.title", 0] },
                },
                {
                  case: { $eq: ["$entityType", "product"] },
                  then: { $arrayElemAt: ["$productInfo.title", 0] },
                },
                {
                  case: { $eq: ["$entityType", "service"] },
                  then: { $arrayElemAt: ["$serviceInfo.title", 0] },
                },
                {
                  case: { $eq: ["$entityType", "user"] },
                  then: { $arrayElemAt: ["$userInfo.name", 0] },
                },
              ],
              default: null,
            },
          },
        },
      },
    ];

    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      basePipeline.push({
        $match: {
          $or: [
            { "reporter.name": regex },
            { "reporter.email": regex },
            { reportCode: regex },
            { details: regex },
            { entityTitle: regex },
          ],
        },
      });
    }

    const [rows, countResult] = await Promise.all([
      this.reportModel
        .aggregate([
          ...basePipeline,
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
          {
            $project: {
              reportCode: 1,
              entityId: 1,
              entityType: 1,
              entityTitle: 1,
              reason: 1,
              details: 1,
              status: 1,
              contentRemoved: 1,
              adminResponse: 1,
              respondedAt: 1,
              closedAt: 1,
              createdAt: 1,
              "reporter._id": 1,
              "reporter.name": 1,
              "reporter.email": 1,
            },
          },
        ])
        .exec(),
      this.reportModel.aggregate([...basePipeline, { $count: "total" }]).exec(),
    ]);

    const total = countResult[0]?.total ?? 0;
    return {
      data: rows,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /** Admin: close a report (no content action). */
  async closeReport(id: string, adminId: string) {
    const report = await this.requireReport(id);
    if (report.status === "closed") {
      throw new BadRequestException("Report is already closed");
    }
    report.status = "closed";
    report.closedBy = new Types.ObjectId(adminId);
    report.closedAt = new Date();
    await report.save();
    return { data: { report } };
  }

  /** Admin: mark the reported content as removed. METADATA-ONLY — flips contentRemoved + closes
   *  the report, but never touches the underlying Shop/Product/Service document (confirmed with
   *  the user: no cascading disable). */
  async removeContent(id: string, adminId: string) {
    const report = await this.requireReport(id);
    report.contentRemoved = true;
    report.status = "closed";
    report.closedBy = new Types.ObjectId(adminId);
    report.closedAt = new Date();
    await report.save();
    return { data: { report } };
  }

  /** Admin: write/replace a response on a report — independent of status, so an admin can
   *  respond while a report is still open and close it separately afterwards. */
  async respondToReport(id: string, adminId: string, response: string) {
    const report = await this.requireReport(id);
    report.adminResponse = response;
    report.respondedBy = new Types.ObjectId(adminId);
    report.respondedAt = new Date();
    await report.save();

    this.notificationsService
      .createAndNotify(
        report.reporterId.toString(),
        "report_responded",
        "REPORT",
        {
          id: (report._id as Types.ObjectId).toString(),
          reportId: (report._id as Types.ObjectId).toString(),
          reportCode: report.reportCode,
        },
        { reportCode: report.reportCode ?? "" },
      )
      .catch((err) =>
        console.error(
          `Failed to notify reporter about response on ${report.reportCode}:`,
          err,
        ),
      );

    return { data: { report } };
  }
}
