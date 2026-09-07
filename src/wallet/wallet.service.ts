import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { isObjectIdLike } from "src/common/utils/object-id.util";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { AdjustBalanceDto } from "./dto/adjust-balance.dto";
import { FreezeWalletDto } from "./dto/freeze-wallet.dto";
import { WalletType } from "./model/wallet.model";
import { WalletAuditLogService } from "./wallet-audit-log.service";
import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletSettingsService } from "./wallet-settings.service";
import { WalletTransactionService } from "./wallet-transaction.service";

/** The wallet-holder columns safe to return in search and detail. Narrower than
 *  `userSummarySelect`, and deliberately explicit: none of the `select: false` columns
 *  Mongoose used to hide can slip in here. */
const walletOwnerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  userCode: true,
  image: true,
  roles: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/** Search/detail/freeze/manual-adjust surface for both User Wallet Management (spec §2) and
 *  Merchant Wallet Management (spec §3) — literally the same code path, discriminated only by
 *  `walletType`, which is what "the same wallet system for both Merchants and Service
 *  Providers" means. Also owns the Wallet Dashboard's 12-metric aggregation (spec §1). */
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
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

    const where: Prisma.UserWhereInput = {};
    if (walletType === "merchant") {
      where.roles = { has: "seller" };
    }

    const term = search?.trim();
    if (term) {
      // Was four `$regex` scans with the term hand-escaped; `contains` parameterises the
      // pattern, so no escaping is needed and the pg_trgm indexes can serve it.
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { userCode: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: walletOwnerSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.user.count({ where }),
    ]);

    const wallets = await this.prisma.wallet.findMany({
      where: { ownerId: { in: users.map((u) => u.id) }, walletType },
    });
    const walletByOwner = new Map(wallets.map((w) => [w.ownerId, w]));

    const data = users.map((u) => ({ ...u, wallet: walletByOwner.get(u.id) ?? null }));

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getWalletDetail(ownerId: string, walletType: WalletType): Promise<any> {
    if (!isObjectIdLike(ownerId)) throw new NotFoundException("User not found");
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, email: true, phone: true, userCode: true, image: true, roles: true },
    });
    if (!owner) throw new NotFoundException("User not found");

    const wallet = await this.ledgerService.findWalletByOwner(ownerId, walletType);

    return { owner, wallet };
  }

  async getLedger(
    ownerId: string,
    walletType: WalletType,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<any>> {
    const wallet = await this.ledgerService.findWalletByOwner(ownerId, walletType);
    if (!wallet) {
      return {
        data: [],
        meta: {
          total: 0,
          page: Number(page) || 1,
          limit: Number(limit) || 10,
          totalPages: 0,
        },
      };
    }
    return this.ledgerService.getLedgerPage(wallet.id, page, limit);
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
      walletId: wallet.id,
      direction: "credit",
      balanceType: "available",
      amountMinor: dto.amountMinor,
      relatedEntityType: "ManualAdjustment",
      reason: dto.reason,
      createdBy: adminId,
    });
    if (walletType === "merchant") {
      await this.ledgerService.incrementWalletTotals(wallet.id, {
        totalReceivedMinor: dto.amountMinor,
      });
    }

    await this.transactionService.recordManualAdjustment({
      type: "manual_credit",
      ownerId,
      walletType,
      amountMinor: dto.amountMinor,
      reason: dto.reason,
      ledgerEntryId: entry.id,
      createdBy: adminId,
    });

    await this.auditLogService.record({
      adminId,
      action: "manual_balance_addition",
      targetType: "Wallet",
      targetId: wallet.id,
      subjectUserId: ownerId,
      oldValue: { availableBalanceMinor: entry.openingBalanceMinor },
      newValue: { availableBalanceMinor: entry.closingBalanceMinor },
      reason: dto.reason,
    });

    return this.ledgerService.getWalletById(wallet.id);
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
      walletId: wallet.id,
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
      ledgerEntryId: entry.id,
      createdBy: adminId,
    });

    await this.auditLogService.record({
      adminId,
      action: "manual_balance_deduction",
      targetType: "Wallet",
      targetId: wallet.id,
      subjectUserId: ownerId,
      oldValue: { availableBalanceMinor: entry.openingBalanceMinor },
      newValue: { availableBalanceMinor: entry.closingBalanceMinor },
      reason: dto.reason,
    });

    return this.ledgerService.getWalletById(wallet.id);
  }

  async freeze(
    ownerId: string,
    walletType: WalletType,
    dto: FreezeWalletDto,
    adminId: string,
  ): Promise<any> {
    const wallet = await this.ledgerService.getOrCreateWallet(ownerId, walletType);
    if (wallet.isFrozen) throw new BadRequestException("Wallet is already frozen");

    const updated = await this.ledgerService.freezeWallet(wallet.id, dto.reason, adminId);

    await this.auditLogService.record({
      adminId,
      action: "wallet_freeze",
      targetType: "Wallet",
      targetId: wallet.id,
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

    const updated = await this.ledgerService.unfreezeWallet(wallet.id);

    await this.auditLogService.record({
      adminId,
      action: "wallet_unfreeze",
      targetType: "Wallet",
      targetId: wallet.id,
      subjectUserId: ownerId,
      oldValue: { isFrozen: true },
      newValue: { isFrozen: false },
    });

    return updated;
  }

  /** Manual reconciliation tool (see WalletLedgerService.recalculateBalance docs). */
  async recalculate(ownerId: string, walletType: WalletType, adminId: string): Promise<any> {
    const wallet = await this.ledgerService.findWalletByOwner(ownerId, walletType);
    if (!wallet) throw new NotFoundException("Wallet not found");

    const before = {
      availableBalanceMinor: wallet.availableBalanceMinor,
      pendingBalanceMinor: wallet.pendingBalanceMinor,
    };
    const updated = await this.ledgerService.recalculateBalance(wallet.id);

    await this.auditLogService.record({
      adminId,
      action: "wallet_recalculated",
      targetType: "Wallet",
      targetId: wallet.id,
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
    // One shared `createdAt` window, spread into each metric — the pipelines all took the
    // same `dateMatch` before.
    let createdAt: Prisma.DateTimeFilter | undefined;
    if (startDate || endDate) {
      createdAt = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
    }
    const inWindow = createdAt ? { createdAt } : {};

    const [
      balanceByType,
      moneyAdded,
      payments,
      totalTransactions,
      discounts,
      earnings,
      withdrawals,
      pendingWithdrawals,
      pendingTransactions,
      refunds,
    ] = await Promise.all([
      this.prisma.wallet.groupBy({
        by: ["walletType"],
        _sum: { availableBalanceMinor: true, pendingBalanceMinor: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { ...inWindow, type: "manual_credit" },
        _sum: { originalAmountMinor: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { ...inWindow, type: "order_payment", status: "completed" },
        _sum: { finalCustomerPaymentMinor: true },
      }),
      this.prisma.walletTransaction.count({ where: inWindow }),
      this.prisma.walletTransaction.aggregate({
        where: inWindow,
        _sum: { customerDiscountAmountMinor: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: inWindow,
        _sum: { fazlMarginAmountMinor: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { ...inWindow, status: "completed" },
        _sum: { requestedAmountMinor: true },
      }),
      this.prisma.withdrawal.count({ where: { ...inWindow, status: "pending" } }),
      this.prisma.walletTransaction.count({ where: { ...inWindow, status: "pending" } }),
      this.prisma.refund.aggregate({
        where: { ...inWindow, refundStatus: "completed" },
        _sum: { refundAmountMinor: true },
      }),
    ]);

    const balanceMap = new Map(
      balanceByType.map((row) => [
        row.walletType,
        (row._sum.availableBalanceMinor ?? 0) + (row._sum.pendingBalanceMinor ?? 0),
      ]),
    );
    const userWalletBalanceMinor = balanceMap.get("user") ?? 0;
    const merchantWalletBalanceMinor = balanceMap.get("merchant") ?? 0;

    return {
      totalWalletBalanceMinor: userWalletBalanceMinor + merchantWalletBalanceMinor,
      userWalletBalanceMinor,
      merchantWalletBalanceMinor,
      totalMoneyAddedMinor: moneyAdded._sum.originalAmountMinor ?? 0,
      totalPaymentsMinor: payments._sum.finalCustomerPaymentMinor ?? 0,
      totalTransactions,
      totalDiscountsMinor: discounts._sum.customerDiscountAmountMinor ?? 0,
      totalFazlEarningsMinor: earnings._sum.fazlMarginAmountMinor ?? 0,
      totalWithdrawalsMinor: withdrawals._sum.requestedAmountMinor ?? 0,
      pendingWithdrawals,
      pendingTransactions,
      refundsMinor: refunds._sum.refundAmountMinor ?? 0,
    };
  }
}
