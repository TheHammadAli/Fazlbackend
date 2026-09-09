import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "src/prisma/prisma.service";
import { ReportRepository } from "src/prisma/repositories/report.repository";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { reportReason as reportReasonWire } from "src/common/utils/enum-wire.util";
import { EmailService } from "src/common/email-service/email-service";
import { NotificationsService } from "src/notifications/notifications.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import type { Report, ReportEntityType } from "./model/report.model";
import type { ReportReason as PrismaReportReason } from "../../generated/prisma/client";
import { resolvePagination } from "src/common/utils/pagination.util";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportRepository: ReportRepository,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) {}

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /**
   * Prisma speaks enum identifiers; the API speaks the stored values. Only
   * `reason` is affected ("Adult Content" <-> AdultContent).
   */
  private toApiShape<T extends { reason?: unknown }>(report: T): T {
    if (!report) return report;
    return { ...report, reason: reportReasonWire.toWire(report.reason as string) };
  }

  private async generateNextCode(): Promise<string> {
    const counter = await this.prisma.counter.upsert({
      where: { id: "reportCode" },
      create: { id: "reportCode", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `REP-${String(counter.seq).padStart(6, "0")}`;
  }

  private async requireOwnOpenReport(id: string, reporterId: string): Promise<Report> {
    if (!isObjectIdLike(id)) throw new NotFoundException("Report not found");
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");
    if (report.reporterId !== reporterId) {
      throw new ForbiddenException("You can only manage your own reports");
    }
    if (report.status !== "open") {
      throw new BadRequestException(
        "This report has already been closed and can no longer be edited",
      );
    }
    return report;
  }

  private async requireReport(id: string): Promise<Report> {
    if (!isObjectIdLike(id)) throw new NotFoundException("Report not found");
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  /**
   * Best-effort title lookup for the "reported X" line in the admin notification
   * email.
   *
   * This was the codebase's only raw-driver call —
   * `reportModel.db.collection(name).findOne(...)` with the collection name
   * built from a string. It is now a typed switch over four models, so a new
   * entity type is a compile error rather than a lookup against a collection
   * that does not exist.
   */
  private async resolveEntityTitle(
    entityId: string,
    entityType: ReportEntityType,
  ): Promise<string> {
    const select = { title: true } as const;

    switch (entityType) {
      case "shop": {
        const row = await this.prisma.shop.findUnique({ where: { id: entityId }, select });
        return row?.title ?? "an item";
      }
      case "product": {
        const row = await this.prisma.product.findUnique({ where: { id: entityId }, select });
        return row?.title ?? "an item";
      }
      case "service": {
        const row = await this.prisma.service.findUnique({ where: { id: entityId }, select });
        return row?.title ?? "an item";
      }
      case "user": {
        // Users have no title; the old code fell through to "services" here and
        // therefore always returned "an item" for a reported user.
        const row = await this.prisma.user.findUnique({
          where: { id: entityId },
          select: { name: true },
        });
        return row?.name ?? "an item";
      }
      default:
        return "an item";
    }
  }

  async createReport(reporterId: string, dto: CreateReportDto) {
    const reportCode = await this.generateNextCode();
    const report = await this.prisma.report.create({
      data: {
        id: generateObjectId(),
        reportCode,
        reporterId,
        entityId: dto.entityId,
        entityType: dto.entityType as ReportEntityType,
        reason: reportReasonWire.fromWire(dto.reason) as PrismaReportReason,
        details: dto.details,
        status: "open",
      },
    });

    this.sendReportSideEffects(report).catch((err) =>
      this.logger.error(
        `Report notification side-effects for ${report.reportCode} failed`,
        err,
      ),
    );

    return {
      message: this.i18n.translate("auth.reports.created_success", { lang: this.lang }),
      data: { report: this.toApiShape(report) },
    };
  }

  /** Fire-and-forget: report creation must succeed even if email sending is slow/down. */
  private async sendReportSideEffects(report: Report) {
    const [reporter, entityTitle] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: report.reporterId },
        select: { name: true, email: true },
      }),
      this.resolveEntityTitle(report.entityId, report.entityType as ReportEntityType),
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
        this.logger.error(`Report-submitted email to ${email} failed`, err),
      );
  }

  /** Notifies exactly the set of admins who can actually access the Reports page —
   *  super_admin (always allowed) plus any admin/moderator with the "reports" permission
   *  entry — mirroring PermissionsGuard's own bypass rule. */
  private async notifyReportToAdmins(
    report: Report,
    entityTitle: string,
    reporterName: string,
    reporterEmail: string,
  ) {
    // Notifies staff, not customers, so this reads `admins` — super admins
    // unconditionally, everyone else only if they hold the reports permission.
    // Members are excluded: they have no reports access to notify them about.
    const recipients = await this.prisma.admin.findMany({
      where: {
        isDisabled: false,
        OR: [
          { role: "super_admin" },
          {
            role: { in: ["admin", "subadmin"] },
            permissions: { some: { page: "reports" } },
          },
        ],
      },
      select: { name: true, email: true },
    });

    const reportsUrl = `${process.env.ADMIN_PANEL_URL}/admin/reports`;
    const reasonLabel = reportReasonWire.toWire(report.reason as string);
    const html = `
      <h2>New report submitted</h2>
      <p><strong>${reporterName}</strong> (${reporterEmail}) reported a <strong>${report.entityType}</strong>:
      "${entityTitle}".</p>
      <p><strong>Reason:</strong> ${reasonLabel}</p>
      <p><strong>Details:</strong> ${report.details}</p>
      <p><a href="${reportsUrl}">${reportsUrl}</a></p>
    `;

    for (const admin of recipients) {
      if (!admin.email) continue;
      this.emailService
        .sendEmail(
          admin.email,
          `New report (${report.reportCode}): ${report.entityType} — ${reasonLabel}`,
          html,
        )
        .catch((err) =>
          this.logger.error(`Report-notification email to ${admin.email} failed`, err),
        );
    }
  }

  async getMyReports(
    reporterId: string,
    rawPage: number | string = 1,
    rawLimit: number | string = 10,
  ) {
    const { page, limit, skip } = resolvePagination(rawPage, rawLimit);
    const where = { reporterId };
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);
    return {
      data: {
        reports: reports.map((r) => this.toApiShape(r)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOwnReport(reporterId: string, id: string, dto: UpdateReportDto) {
    await this.requireOwnOpenReport(id, reporterId);

    const report = await this.prisma.report.update({
      where: { id },
      data: {
        ...(dto.reason !== undefined
          ? { reason: reportReasonWire.fromWire(dto.reason) as PrismaReportReason }
          : {}),
        ...(dto.details !== undefined ? { details: dto.details } : {}),
      },
    });

    return {
      message: this.i18n.translate("auth.reports.updated_success", { lang: this.lang }),
      data: { report: this.toApiShape(report) },
    };
  }

  async deleteOwnReport(reporterId: string, id: string) {
    await this.requireOwnOpenReport(id, reporterId);
    await this.prisma.report.delete({ where: { id } });
    return {
      message: this.i18n.translate("auth.reports.deleted_success", { lang: this.lang }),
    };
  }

  /** Paginated/filterable/searchable list for the admin Reports page. Reporter and reported-entity
   *  title are joined in SQL across users/shops/products/services — see ReportRepository. */
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

    // The repository queries the stored enum values directly, so `reason`
    // arrives here already in wire form and needs no translation.
    const { rows, total } = await this.reportRepository.findForAdmin({
      skip,
      take: limitNum,
      entityType,
      status,
      reason,
      search,
      startDate,
      endDate,
    });

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
    const existing = await this.requireReport(id);
    if (existing.status === "closed") {
      throw new BadRequestException("Report is already closed");
    }
    const report = await this.prisma.report.update({
      where: { id },
      data: { status: "closed", closedById: adminId, closedAt: new Date() },
    });
    return { data: { report: this.toApiShape(report) } };
  }

  /** Admin: mark the reported content as removed. METADATA-ONLY — flips contentRemoved + closes
   *  the report, but never touches the underlying Shop/Product/Service row (confirmed with
   *  the user: no cascading disable). */
  async removeContent(id: string, adminId: string) {
    await this.requireReport(id);
    const report = await this.prisma.report.update({
      where: { id },
      data: {
        contentRemoved: true,
        status: "closed",
        closedById: adminId,
        closedAt: new Date(),
      },
    });
    return { data: { report: this.toApiShape(report) } };
  }

  /** Admin: write/replace a response on a report — independent of status, so an admin can
   *  respond while a report is still open and close it separately afterwards. */
  async respondToReport(id: string, adminId: string, response: string) {
    await this.requireReport(id);

    const report = await this.prisma.report.update({
      where: { id },
      data: {
        adminResponse: response,
        respondedById: adminId,
        respondedAt: new Date(),
      },
    });

    this.notificationsService
      .createAndNotify(
        report.reporterId,
        "report_responded",
        "REPORT",
        {
          id: report.id,
          reportId: report.id,
          reportCode: report.reportCode,
        },
        { reportCode: report.reportCode ?? "" },
      )
      .catch((err) =>
        this.logger.error(
          `Failed to notify reporter about response on ${report.reportCode}`,
          err,
        ),
      );

    return { data: { report: this.toApiShape(report) } };
  }
}
