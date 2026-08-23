import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import { Refund, RefundDocument } from "./schema/refund.schema";
import { CreateRefundDto, RejectRefundDto } from "./dto/create-refund.dto";
import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletTransactionService } from "./wallet-transaction.service";
import { WalletAuditLogService } from "./wallet-audit-log.service";

/** Simple one-step refund workflow (spec §8, confirmed with stakeholder — not a multi-stage
 *  chain like Withdrawals): a refund is created as "pending", then resolved by exactly one
 *  decisive admin action — complete (posts the crediting ledger entry) or reject (reason only,
 *  no ledger effect). The spec's "Admin/Action Log" field is derived from WalletAuditLog
 *  rather than duplicated here, avoiding a second source of truth. */
@Injectable()
export class RefundService {
  constructor(
    @InjectModel(Refund.name) private readonly refundModel: Model<RefundDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
    private readonly ledgerService: WalletLedgerService,
    private readonly transactionService: WalletTransactionService,
    private readonly auditLogService: WalletAuditLogService,
  ) {}

  private async generateNextCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "refundCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `RFD-${String(counter.seq).padStart(6, "0")}`;
  }

  private async requireRefund(id: string): Promise<RefundDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Refund not found");
    const refund = await this.refundModel.findById(id);
    if (!refund) throw new NotFoundException("Refund not found");
    return refund;
  }

  async create(dto: CreateRefundDto, adminId: string): Promise<RefundDocument> {
    const original = await this.transactionService.requireById(dto.originalTransactionId);
    if (original.paymentMethod !== "fazl_wallet") {
      throw new BadRequestException("Only Fazl Wallet transactions can be refunded through the wallet ledger");
    }
    if (dto.refundAmountMinor > original.finalCustomerPaymentMinor) {
      throw new BadRequestException("Refund amount cannot exceed the original payment");
    }

    const refundCode = await this.generateNextCode();
    return this.refundModel.create({
      refundCode,
      originalTransactionId: original._id,
      orderId: original.orderId ?? null,
      customerId: original.userId,
      merchantId: original.merchantId ?? null,
      refundAmountMinor: dto.refundAmountMinor,
      refundReason: dto.refundReason,
      refundStatus: "pending",
      createdBy: new Types.ObjectId(adminId),
    });
  }

  async complete(id: string, adminId: string): Promise<RefundDocument> {
    const refund = await this.requireRefund(id);
    if (refund.refundStatus !== "pending") {
      throw new BadRequestException(`Cannot complete a refund in "${refund.refundStatus}" status`);
    }
    const original = await this.transactionService.requireById(refund.originalTransactionId.toString());

    const customerWallet = await this.ledgerService.getOrCreateWallet(original.userId.toString(), "user");
    const entry = await this.ledgerService.postEntry({
      walletId: customerWallet._id.toString(),
      direction: "credit",
      balanceType: "available",
      amountMinor: refund.refundAmountMinor,
      relatedEntityType: "Refund",
      relatedEntityId: refund._id.toString(),
      reason: refund.refundReason,
      createdBy: adminId,
    });

    const creditTxn = await this.transactionService.recordRefundCredit({
      originalTransaction: original,
      refundAmountMinor: refund.refundAmountMinor,
      ledgerEntryIds: [entry._id.toString()],
      refundCode: refund.refundCode ?? refund._id.toString(),
      createdBy: adminId,
    });

    refund.refundStatus = "completed";
    refund.ledgerEntryIds = [entry._id as any];
    await refund.save();

    const priorCompleted = await this.refundModel
      .find({ originalTransactionId: original._id, refundStatus: "completed" })
      .lean();
    const totalRefunded = priorCompleted.reduce((sum, r) => sum + r.refundAmountMinor, 0);
    await this.transactionService.setRefundStatus(
      original._id.toString(),
      totalRefunded >= original.finalCustomerPaymentMinor ? "full" : "partial",
    );

    await this.auditLogService.record({
      adminId,
      action: "refund",
      targetType: "Refund",
      targetId: refund._id.toString(),
      transactionId: creditTxn._id.toString(),
      subjectUserId: original.userId.toString(),
      oldValue: { refundStatus: "pending" },
      newValue: { refundStatus: "completed", refundAmountMinor: refund.refundAmountMinor },
      reason: refund.refundReason,
    });
    return refund;
  }

  async reject(id: string, dto: RejectRefundDto, adminId: string): Promise<RefundDocument> {
    const refund = await this.requireRefund(id);
    if (refund.refundStatus !== "pending") {
      throw new BadRequestException(`Cannot reject a refund in "${refund.refundStatus}" status`);
    }
    refund.refundStatus = "rejected";
    refund.rejectionReason = dto.reason;
    await refund.save();

    await this.auditLogService.record({
      adminId,
      action: "refund_rejection",
      targetType: "Refund",
      targetId: id,
      subjectUserId: refund.customerId.toString(),
      oldValue: { refundStatus: "pending" },
      newValue: { refundStatus: "rejected" },
      reason: dto.reason,
    });
    return refund;
  }

  async getList(
    filters: { search?: string; refundStatus?: string; customerId?: string; merchantId?: string; startDate?: string; endDate?: string },
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const match: Record<string, any> = {};
    if (filters.refundStatus?.trim()) match.refundStatus = filters.refundStatus.trim();
    if (filters.customerId?.trim() && Types.ObjectId.isValid(filters.customerId.trim())) {
      match.customerId = new Types.ObjectId(filters.customerId.trim());
    }
    if (filters.merchantId?.trim() && Types.ObjectId.isValid(filters.merchantId.trim())) {
      match.merchantId = new Types.ObjectId(filters.merchantId.trim());
    }
    if (filters.startDate || filters.endDate) {
      match.createdAt = {};
      if (filters.startDate) match.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        match.createdAt.$lte = endOfDay;
      }
    }
    if (filters.search?.trim()) {
      const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      match.refundCode = { $regex: escaped, $options: "i" };
    }

    const [data, total] = await Promise.all([
      this.refundModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("customerId", "name email userCode")
        .populate("merchantId", "name email userCode")
        .lean(),
      this.refundModel.countDocuments(match),
    ]);

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getDetail(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Refund not found");
    const refund = await this.refundModel
      .findById(id)
      .populate("customerId", "name email userCode")
      .populate("merchantId", "name email userCode")
      .populate("originalTransactionId")
      .lean();
    if (!refund) throw new NotFoundException("Refund not found");
    return refund;
  }
}
