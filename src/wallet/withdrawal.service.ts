import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import { Withdrawal, WithdrawalDocument } from "./schema/withdrawal.schema";
import { CreateWithdrawalDto } from "./dto/create-withdrawal.dto";
import {
  CancelWithdrawalDto,
  CompleteWithdrawalDto,
  RejectWithdrawalDto,
} from "./dto/withdrawal-actions.dto";
import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletTransactionService } from "./wallet-transaction.service";
import { WalletAuditLogService } from "./wallet-audit-log.service";
import { WalletSettingsService } from "./wallet-settings.service";

/** Full withdrawal state machine (spec §7): pending -> approved -> processing -> completed,
 *  with reject/cancel available at earlier stages. Only `complete` ever touches the ledger —
 *  every earlier transition is a pure status change so nothing debits the wallet until the
 *  money has actually left. Fazl's own platform fee is fixed at 0%; externalFeeAmountMinor is
 *  informational only and is never subtracted from requestedAmountMinor. */
@Injectable()
export class WithdrawalService {
  constructor(
    @InjectModel(Withdrawal.name) private readonly withdrawalModel: Model<WithdrawalDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
    private readonly ledgerService: WalletLedgerService,
    private readonly transactionService: WalletTransactionService,
    private readonly auditLogService: WalletAuditLogService,
    private readonly walletSettingsService: WalletSettingsService,
  ) {}

  private async generateNextCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "withdrawalCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `WDR-${String(counter.seq).padStart(6, "0")}`;
  }

  private async requireWithdrawal(id: string): Promise<WithdrawalDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Withdrawal not found");
    const withdrawal = await this.withdrawalModel.findById(id);
    if (!withdrawal) throw new NotFoundException("Withdrawal not found");
    return withdrawal;
  }

  async create(dto: CreateWithdrawalDto, adminId: string): Promise<WithdrawalDocument> {
    if (!dto.accountDetails?.accountTitle?.trim() || !dto.accountDetails?.accountNumber?.trim()) {
      throw new BadRequestException("Account title and account number are required");
    }

    await this.walletSettingsService.assertWalletEnabled();
    await this.walletSettingsService.assertWithdrawalEnabled();
    await this.walletSettingsService.assertWithdrawalAmountWithinLimits(dto.requestedAmountMinor);

    const wallet = await this.ledgerService.findWalletByOwner(dto.merchantId, "merchant");
    if (!wallet) throw new BadRequestException("Merchant has no wallet yet — nothing to withdraw");
    if (wallet.isFrozen) throw new BadRequestException("Merchant wallet is frozen");
    if (dto.requestedAmountMinor > wallet.availableBalanceMinor) {
      throw new BadRequestException("Requested amount exceeds available balance");
    }

    const withdrawalCode = await this.generateNextCode();
    const withdrawal = await this.withdrawalModel.create({
      withdrawalCode,
      merchantId: new Types.ObjectId(dto.merchantId),
      walletId: wallet._id,
      requestedAmountMinor: dto.requestedAmountMinor,
      availableBalanceSnapshotMinor: wallet.availableBalanceMinor,
      withdrawalMethod: dto.withdrawalMethod,
      accountDetails: dto.accountDetails,
      status: "pending",
      platformFeePercent: 0,
      createdBy: new Types.ObjectId(adminId),
    });

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_created",
      targetType: "Withdrawal",
      targetId: withdrawal._id.toString(),
      subjectUserId: dto.merchantId,
      newValue: { requestedAmountMinor: dto.requestedAmountMinor, status: "pending" },
    });

    return withdrawal;
  }

  async getList(
    filters: { status?: string; merchantId?: string; startDate?: string; endDate?: string; search?: string },
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const match: Record<string, any> = {};
    if (filters.status?.trim()) match.status = filters.status.trim();
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
      match.withdrawalCode = { $regex: escaped, $options: "i" };
    }

    const [data, total] = await Promise.all([
      this.withdrawalModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("merchantId", "name email userCode")
        .lean(),
      this.withdrawalModel.countDocuments(match),
    ]);

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getForMerchant(merchantId: string, page = 1, limit = 10): Promise<PaginatedResponseDto<any>> {
    return this.getList({ merchantId }, page, limit);
  }

  async getDetail(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Withdrawal not found");
    const withdrawal = await this.withdrawalModel
      .findById(id)
      .populate("merchantId", "name email userCode")
      .populate("transactionId")
      .lean();
    if (!withdrawal) throw new NotFoundException("Withdrawal not found");
    return withdrawal;
  }

  async approve(id: string, adminId: string): Promise<WithdrawalDocument> {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status !== "pending") {
      throw new BadRequestException(`Cannot approve a withdrawal in "${withdrawal.status}" status`);
    }
    const oldStatus = withdrawal.status;
    withdrawal.status = "approved";
    await withdrawal.save();

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_approval",
      targetType: "Withdrawal",
      targetId: id,
      subjectUserId: withdrawal.merchantId.toString(),
      oldValue: { status: oldStatus },
      newValue: { status: "approved" },
    });
    return withdrawal;
  }

  async reject(id: string, dto: RejectWithdrawalDto, adminId: string): Promise<WithdrawalDocument> {
    const withdrawal = await this.requireWithdrawal(id);
    if (!["pending", "approved"].includes(withdrawal.status)) {
      throw new BadRequestException(`Cannot reject a withdrawal in "${withdrawal.status}" status`);
    }
    const oldStatus = withdrawal.status;
    withdrawal.status = "rejected";
    withdrawal.rejectionReason = dto.reason;
    await withdrawal.save();

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_rejection",
      targetType: "Withdrawal",
      targetId: id,
      subjectUserId: withdrawal.merchantId.toString(),
      oldValue: { status: oldStatus },
      newValue: { status: "rejected" },
      reason: dto.reason,
    });
    return withdrawal;
  }

  async markProcessing(id: string, adminId: string): Promise<WithdrawalDocument> {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status !== "approved") {
      throw new BadRequestException("Only an approved withdrawal can move to processing");
    }
    withdrawal.status = "processing";
    withdrawal.processingDate = new Date();
    await withdrawal.save();

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_status_change",
      targetType: "Withdrawal",
      targetId: id,
      subjectUserId: withdrawal.merchantId.toString(),
      oldValue: { status: "approved" },
      newValue: { status: "processing" },
    });
    return withdrawal;
  }

  async complete(id: string, dto: CompleteWithdrawalDto, adminId: string): Promise<WithdrawalDocument> {
    const withdrawal = await this.requireWithdrawal(id);
    if (!["approved", "processing"].includes(withdrawal.status)) {
      throw new BadRequestException(`Cannot complete a withdrawal in "${withdrawal.status}" status`);
    }

    const entry = await this.ledgerService.postEntry({
      walletId: withdrawal.walletId.toString(),
      direction: "debit",
      balanceType: "available",
      amountMinor: withdrawal.requestedAmountMinor,
      relatedEntityType: "Withdrawal",
      relatedEntityId: withdrawal._id.toString(),
      reason: `Withdrawal ${withdrawal.withdrawalCode} completed`,
      createdBy: adminId,
    });
    await this.ledgerService.incrementWalletTotals(withdrawal.walletId.toString(), {
      totalWithdrawnMinor: withdrawal.requestedAmountMinor,
    });

    const txn = await this.transactionService.recordWithdrawalDebit({
      merchantId: withdrawal.merchantId.toString(),
      amountMinor: withdrawal.requestedAmountMinor,
      ledgerEntryId: entry._id.toString(),
      withdrawalCode: withdrawal.withdrawalCode ?? withdrawal._id.toString(),
      createdBy: adminId,
    });

    const oldStatus = withdrawal.status;
    withdrawal.status = "completed";
    withdrawal.completedDate = new Date();
    withdrawal.transactionId = txn._id;
    if (dto.externalFeeAmountMinor !== undefined) withdrawal.externalFeeAmountMinor = dto.externalFeeAmountMinor;
    if (dto.externalFeeNote) withdrawal.externalFeeNote = dto.externalFeeNote;
    await withdrawal.save();

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_status_change",
      targetType: "Withdrawal",
      targetId: id,
      transactionId: txn._id.toString(),
      subjectUserId: withdrawal.merchantId.toString(),
      oldValue: { status: oldStatus },
      newValue: { status: "completed", requestedAmountMinor: withdrawal.requestedAmountMinor },
    });
    return withdrawal;
  }

  async cancel(id: string, dto: CancelWithdrawalDto, adminId: string): Promise<WithdrawalDocument> {
    const withdrawal = await this.requireWithdrawal(id);
    if (["completed", "rejected", "cancelled"].includes(withdrawal.status)) {
      throw new BadRequestException(`Cannot cancel a withdrawal in "${withdrawal.status}" status`);
    }
    const oldStatus = withdrawal.status;
    withdrawal.status = "cancelled";
    withdrawal.cancellationReason = dto.reason;
    await withdrawal.save();

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_cancelled",
      targetType: "Withdrawal",
      targetId: id,
      subjectUserId: withdrawal.merchantId.toString(),
      oldValue: { status: oldStatus },
      newValue: { status: "cancelled" },
      reason: dto.reason,
    });
    return withdrawal;
  }
}
