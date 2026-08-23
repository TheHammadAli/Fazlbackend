import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { User, UserDocument } from "src/users/schema/users.schema";
import { Wallet, WalletDocument, WalletType } from "./schema/wallet.schema";
import { WalletTransaction, WalletTransactionDocument } from "./schema/wallet-transaction.schema";
import { Withdrawal, WithdrawalDocument } from "./schema/withdrawal.schema";
import { Refund, RefundDocument } from "./schema/refund.schema";
import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletTransactionService } from "./wallet-transaction.service";
import { WalletAuditLogService } from "./wallet-audit-log.service";
import { WalletSettingsService } from "./wallet-settings.service";
import { AdjustBalanceDto } from "./dto/adjust-balance.dto";
import { FreezeWalletDto } from "./dto/freeze-wallet.dto";

/** Search/detail/freeze/manual-adjust surface for both User Wallet Management (spec §2) and
 *  Merchant Wallet Management (spec §3) — literally the same code path, discriminated only by
 *  `walletType`, which is what "the same wallet system for both Merchants and Service
 *  Providers" means. Also owns the Wallet Dashboard's 12-metric aggregation (spec §1). */
@Injectable()
export class WalletService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly transactionModel: Model<WalletTransactionDocument>,
    @InjectModel(Withdrawal.name) private readonly withdrawalModel: Model<WithdrawalDocument>,
    @InjectModel(Refund.name) private readonly refundModel: Model<RefundDocument>,
    private readonly ledgerService: WalletLedgerService,
    private readonly transactionService: WalletTransactionService,
    private readonly auditLogService: WalletAuditLogService,
    private readonly walletSettingsService: WalletSettingsService,
  ) {}

  async searchWallets(
    walletType: WalletType,
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const userFilter: Record<string, any> = {};
    if (walletType === "merchant") {
      userFilter.roles = "seller";
    }
    if (search?.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      userFilter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { userCode: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(userFilter)
        .select("name email phone userCode image roles createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      this.userModel.countDocuments(userFilter),
    ]);

    const userIds = users.map((u) => u._id);
    const wallets = await this.walletModel.find({ ownerId: { $in: userIds }, walletType }).lean();
    const walletByOwner = new Map(wallets.map((w) => [w.ownerId.toString(), w]));

    const data = users.map((u) => ({
      ...u,
      wallet: walletByOwner.get(u._id.toString()) ?? null,
    }));

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getWalletDetail(ownerId: string, walletType: WalletType): Promise<any> {
    if (!Types.ObjectId.isValid(ownerId)) throw new NotFoundException("User not found");
    const owner = await this.userModel
      .findById(ownerId)
      .select("name email phone userCode image roles")
      .lean();
    if (!owner) throw new NotFoundException("User not found");

    const wallet = await this.walletModel
      .findOne({ ownerId: new Types.ObjectId(ownerId), walletType })
      .lean();

    return { owner, wallet: wallet ?? null };
  }

  async getLedger(
    ownerId: string,
    walletType: WalletType,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<any>> {
    const wallet = await this.ledgerService.findWalletByOwner(ownerId, walletType);
    if (!wallet) {
      return { data: [], meta: { total: 0, page: Number(page) || 1, limit: Number(limit) || 10, totalPages: 0 } };
    }
    return this.ledgerService.getLedgerPage(wallet._id.toString(), page, limit);
  }

  async addBalance(
    ownerId: string,
    walletType: WalletType,
    dto: AdjustBalanceDto,
    adminId: string,
  ): Promise<any> {
    await this.walletSettingsService.assertWalletEnabled();
    await this.walletSettingsService.assertTopUpAmountWithinLimits(dto.amountMinor);

    const wallet = await this.ledgerService.getOrCreateWallet(ownerId, walletType);
    const entry = await this.ledgerService.postEntry({
      walletId: wallet._id.toString(),
      direction: "credit",
      balanceType: "available",
      amountMinor: dto.amountMinor,
      relatedEntityType: "ManualAdjustment",
      reason: dto.reason,
      createdBy: adminId,
    });
    if (walletType === "merchant") {
      await this.ledgerService.incrementWalletTotals(wallet._id.toString(), {
        totalReceivedMinor: dto.amountMinor,
      });
    }

    await this.transactionService.recordManualAdjustment({
      type: "manual_credit",
      ownerId,
      walletType,
      amountMinor: dto.amountMinor,
      reason: dto.reason,
      ledgerEntryId: entry._id.toString(),
      createdBy: adminId,
    });

    await this.auditLogService.record({
      adminId,
      action: "manual_balance_addition",
      targetType: "Wallet",
      targetId: wallet._id.toString(),
      subjectUserId: ownerId,
      oldValue: { availableBalanceMinor: entry.openingBalanceMinor },
      newValue: { availableBalanceMinor: entry.closingBalanceMinor },
      reason: dto.reason,
    });

    return this.ledgerService.getWalletById(wallet._id.toString());
  }

  async deductBalance(
    ownerId: string,
    walletType: WalletType,
    dto: AdjustBalanceDto,
    adminId: string,
  ): Promise<any> {
    await this.walletSettingsService.assertWalletEnabled();

    const wallet = await this.ledgerService.getOrCreateWallet(ownerId, walletType);
    const entry = await this.ledgerService.postEntry({
      walletId: wallet._id.toString(),
      direction: "debit",
      balanceType: "available",
      amountMinor: dto.amountMinor,
      relatedEntityType: "ManualAdjustment",
      reason: dto.reason,
      createdBy: adminId,
    });

    await this.transactionService.recordManualAdjustment({
      type: "manual_debit",
      ownerId,
      walletType,
      amountMinor: dto.amountMinor,
      reason: dto.reason,
      ledgerEntryId: entry._id.toString(),
      createdBy: adminId,
    });

    await this.auditLogService.record({
      adminId,
      action: "manual_balance_deduction",
      targetType: "Wallet",
      targetId: wallet._id.toString(),
      subjectUserId: ownerId,
      oldValue: { availableBalanceMinor: entry.openingBalanceMinor },
      newValue: { availableBalanceMinor: entry.closingBalanceMinor },
      reason: dto.reason,
    });

    return this.ledgerService.getWalletById(wallet._id.toString());
  }

  async freeze(ownerId: string, walletType: WalletType, dto: FreezeWalletDto, adminId: string): Promise<any> {
    const wallet = await this.ledgerService.getOrCreateWallet(ownerId, walletType);
    if (wallet.isFrozen) throw new BadRequestException("Wallet is already frozen");

    const updated = await this.ledgerService.freezeWallet(wallet._id.toString(), dto.reason, adminId);

    await this.auditLogService.record({
      adminId,
      action: "wallet_freeze",
      targetType: "Wallet",
      targetId: wallet._id.toString(),
      subjectUserId: ownerId,
      oldValue: { isFrozen: false },
      newValue: { isFrozen: true },
      reason: dto.reason,
    });

    return updated;
  }

  async unfreeze(ownerId: string, walletType: WalletType, adminId: string): Promise<any> {
    const wallet = await this.ledgerService.findWalletByOwner(ownerId, walletType);
    if (!wallet) throw new NotFoundException("Wallet not found");
    if (!wallet.isFrozen) throw new BadRequestException("Wallet is not frozen");

    const updated = await this.ledgerService.unfreezeWallet(wallet._id.toString());

    await this.auditLogService.record({
      adminId,
      action: "wallet_unfreeze",
      targetType: "Wallet",
      targetId: wallet._id.toString(),
      subjectUserId: ownerId,
      oldValue: { isFrozen: true },
      newValue: { isFrozen: false },
    });

    return updated;
  }

  /** Manual reconciliation safety net (see WalletLedgerService.recalculateBalance docs). */
  async recalculate(ownerId: string, walletType: WalletType, adminId: string): Promise<any> {
    const wallet = await this.ledgerService.findWalletByOwner(ownerId, walletType);
    if (!wallet) throw new NotFoundException("Wallet not found");

    const before = {
      availableBalanceMinor: wallet.availableBalanceMinor,
      pendingBalanceMinor: wallet.pendingBalanceMinor,
    };
    const updated = await this.ledgerService.recalculateBalance(wallet._id.toString());

    await this.auditLogService.record({
      adminId,
      action: "wallet_recalculated",
      targetType: "Wallet",
      targetId: wallet._id.toString(),
      subjectUserId: ownerId,
      oldValue: before,
      newValue: {
        availableBalanceMinor: updated.availableBalanceMinor,
        pendingBalanceMinor: updated.pendingBalanceMinor,
      },
    });

    return updated;
  }

  async getDashboardStats(startDate?: string, endDate?: string) {
    const dateMatch: Record<string, any> = {};
    if (startDate || endDate) {
      dateMatch.createdAt = {};
      if (startDate) dateMatch.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateMatch.createdAt.$lte = endOfDay;
      }
    }

    const [
      balanceByType,
      moneyAddedAgg,
      paymentsAgg,
      totalTransactions,
      discountsAgg,
      earningsAgg,
      withdrawalsAgg,
      pendingWithdrawals,
      pendingTransactions,
      refundsAgg,
    ] = await Promise.all([
      this.walletModel.aggregate([
        {
          $group: {
            _id: "$walletType",
            total: { $sum: { $add: ["$availableBalanceMinor", "$pendingBalanceMinor"] } },
          },
        },
      ]),
      this.transactionModel.aggregate([
        { $match: { ...dateMatch, type: "manual_credit" } },
        { $group: { _id: null, total: { $sum: "$originalAmountMinor" } } },
      ]),
      this.transactionModel.aggregate([
        { $match: { ...dateMatch, type: "order_payment", status: "completed" } },
        { $group: { _id: null, total: { $sum: "$finalCustomerPaymentMinor" } } },
      ]),
      this.transactionModel.countDocuments(dateMatch),
      this.transactionModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: null, total: { $sum: "$customerDiscountAmountMinor" } } },
      ]),
      this.transactionModel.aggregate([
        { $match: dateMatch },
        { $group: { _id: null, total: { $sum: "$fazlMarginAmountMinor" } } },
      ]),
      this.withdrawalModel.aggregate([
        { $match: { ...dateMatch, status: "completed" } },
        { $group: { _id: null, total: { $sum: "$requestedAmountMinor" } } },
      ]),
      this.withdrawalModel.countDocuments({ ...dateMatch, status: "pending" }),
      this.transactionModel.countDocuments({ ...dateMatch, status: "pending" }),
      this.refundModel.aggregate([
        { $match: { ...dateMatch, refundStatus: "completed" } },
        { $group: { _id: null, total: { $sum: "$refundAmountMinor" } } },
      ]),
    ]);

    const balanceMap = new Map(balanceByType.map((row) => [row._id, row.total as number]));
    const userWalletBalanceMinor = balanceMap.get("user") ?? 0;
    const merchantWalletBalanceMinor = balanceMap.get("merchant") ?? 0;

    return {
      totalWalletBalanceMinor: userWalletBalanceMinor + merchantWalletBalanceMinor,
      userWalletBalanceMinor,
      merchantWalletBalanceMinor,
      totalMoneyAddedMinor: moneyAddedAgg[0]?.total ?? 0,
      totalPaymentsMinor: paymentsAgg[0]?.total ?? 0,
      totalTransactions,
      totalDiscountsMinor: discountsAgg[0]?.total ?? 0,
      totalFazlEarningsMinor: earningsAgg[0]?.total ?? 0,
      totalWithdrawalsMinor: withdrawalsAgg[0]?.total ?? 0,
      pendingWithdrawals,
      pendingTransactions,
      refundsMinor: refundsAgg[0]?.total ?? 0,
    };
  }
}
