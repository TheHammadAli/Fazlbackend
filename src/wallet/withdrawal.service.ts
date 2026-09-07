import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { COUNTER_KEYS } from "src/common/model/counter.model";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { CreateWithdrawalDto } from "./dto/create-withdrawal.dto";
import {
  CancelWithdrawalDto,
  CompleteWithdrawalDto,
  RejectWithdrawalDto,
} from "./dto/withdrawal-actions.dto";
import {
  WITHDRAWAL_PLATFORM_FEE_PERCENT,
  WITHDRAWAL_STATUSES,
  Withdrawal,
  WithdrawalStatus,
} from "./model/wallet.model";
import { WalletAuditLogService } from "./wallet-audit-log.service";
import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletSettingsService } from "./wallet-settings.service";
import { WalletTransactionService } from "./wallet-transaction.service";

const merchantSelect = {
  id: true,
  name: true,
  email: true,
  userCode: true,
} satisfies Prisma.UserSelect;

/** The four account columns are flat in Postgres but nested in the API, which is the
 *  shape every existing client already reads. */
function withAccountDetails<T extends Pick<Withdrawal, "accountTitle" | "accountNumber" | "bankName" | "iban">>(
  row: T,
) {
  const { accountTitle, accountNumber, bankName, iban, ...rest } = row;
  return { ...rest, accountDetails: { accountTitle, accountNumber, bankName, iban } };
}

/** Full withdrawal state machine (spec §7): pending -> approved -> processing -> completed,
 *  with reject/cancel available at earlier stages. Only `complete` ever touches the ledger —
 *  every earlier transition is a pure status change so nothing debits the wallet until the
 *  money has actually left. Fazl's own platform fee is fixed at 0%; externalFeeAmountMinor is
 *  informational only and is never subtracted from requestedAmountMinor. */
@Injectable()
export class WithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: WalletLedgerService,
    private readonly transactionService: WalletTransactionService,
    private readonly auditLogService: WalletAuditLogService,
    private readonly walletSettingsService: WalletSettingsService,
  ) {}

  private async generateNextCode(client: Prisma.TransactionClient): Promise<string> {
    const counter = await client.counter.upsert({
      where: { id: COUNTER_KEYS.withdrawal },
      create: { id: COUNTER_KEYS.withdrawal, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `WDR-${String(counter.seq).padStart(6, "0")}`;
  }

  private async requireWithdrawal(id: string): Promise<Withdrawal> {
    if (!isObjectIdLike(id)) throw new NotFoundException("Withdrawal not found");
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new NotFoundException("Withdrawal not found");
    return withdrawal;
  }

  async create(dto: CreateWithdrawalDto, adminId: string) {
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

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const withdrawalCode = await this.generateNextCode(tx);
      return tx.withdrawal.create({
        data: {
          id: generateObjectId(),
          withdrawalCode,
          merchantId: dto.merchantId,
          walletId: wallet.id,
          requestedAmountMinor: dto.requestedAmountMinor,
          availableBalanceSnapshotMinor: wallet.availableBalanceMinor,
          withdrawalMethod: dto.withdrawalMethod,
          accountTitle: dto.accountDetails.accountTitle,
          accountNumber: dto.accountDetails.accountNumber,
          bankName: dto.accountDetails.bankName ?? null,
          iban: dto.accountDetails.iban ?? null,
          status: "pending",
          platformFeePercent: WITHDRAWAL_PLATFORM_FEE_PERCENT,
          createdById: adminId,
        },
      });
    });

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_created",
      targetType: "Withdrawal",
      targetId: withdrawal.id,
      subjectUserId: dto.merchantId,
      newValue: { requestedAmountMinor: dto.requestedAmountMinor, status: "pending" },
    });

    return withAccountDetails(withdrawal);
  }

  async getList(
    filters: {
      status?: string;
      merchantId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const emptyPage = {
      data: [],
      meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
    };

    const where: Prisma.WithdrawalWhereInput = {};

    // An unrecognised enum value is a Prisma validation error rather than a query that
    // matches nothing, so it short-circuits to an empty page instead.
    const status = filters.status?.trim();
    if (status) {
      if (!(WITHDRAWAL_STATUSES as readonly string[]).includes(status)) return emptyPage;
      where.status = status as WithdrawalStatus;
    }

    const merchantId = filters.merchantId?.trim();
    if (merchantId && isObjectIdLike(merchantId)) where.merchantId = merchantId;

    if (filters.startDate || filters.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      where.createdAt = createdAt;
    }

    const search = filters.search?.trim();
    if (search) {
      where.withdrawalCode = { contains: search, mode: "insensitive" };
    }

    const [rows, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: { merchant: { select: merchantSelect } },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return {
      // `.populate("merchantId")` replaced the id with the object; `include` adds a
      // sibling and leaves the id a string, so it is renamed back onto merchantId.
      data: rows.map(({ merchant, ...row }) => ({
        ...withAccountDetails(row),
        merchantId: merchant,
      })),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getForMerchant(
    merchantId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<any>> {
    return this.getList({ merchantId }, page, limit);
  }

  async getDetail(id: string): Promise<any> {
    if (!isObjectIdLike(id)) throw new NotFoundException("Withdrawal not found");
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id },
      include: {
        merchant: { select: merchantSelect },
        transaction: true,
      },
    });
    if (!withdrawal) throw new NotFoundException("Withdrawal not found");

    const { merchant, transaction, ...row } = withdrawal;
    return {
      ...withAccountDetails(row),
      merchantId: merchant,
      transactionId: transaction,
    };
  }

  async approve(id: string, adminId: string) {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status !== "pending") {
      throw new BadRequestException(`Cannot approve a withdrawal in "${withdrawal.status}" status`);
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id },
      data: { status: "approved" },
    });

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_approval",
      targetType: "Withdrawal",
      targetId: id,
      subjectUserId: withdrawal.merchantId,
      oldValue: { status: withdrawal.status },
      newValue: { status: "approved" },
    });
    return withAccountDetails(updated);
  }

  async reject(id: string, dto: RejectWithdrawalDto, adminId: string) {
    const withdrawal = await this.requireWithdrawal(id);
    if (!["pending", "approved"].includes(withdrawal.status)) {
      throw new BadRequestException(`Cannot reject a withdrawal in "${withdrawal.status}" status`);
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id },
      data: { status: "rejected", rejectionReason: dto.reason },
    });

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_rejection",
      targetType: "Withdrawal",
      targetId: id,
      subjectUserId: withdrawal.merchantId,
      oldValue: { status: withdrawal.status },
      newValue: { status: "rejected" },
      reason: dto.reason,
    });
    return withAccountDetails(updated);
  }

  async markProcessing(id: string, adminId: string) {
    const withdrawal = await this.requireWithdrawal(id);
    if (withdrawal.status !== "approved") {
      throw new BadRequestException("Only an approved withdrawal can move to processing");
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id },
      data: { status: "processing", processingDate: new Date() },
    });

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_status_change",
      targetType: "Withdrawal",
      targetId: id,
      subjectUserId: withdrawal.merchantId,
      oldValue: { status: "approved" },
      newValue: { status: "processing" },
    });
    return withAccountDetails(updated);
  }

  /** The only transition that moves money. The status check and the ledger debit are
   *  still separate steps, exactly as before: two admins completing the same withdrawal
   *  at the same instant could both pass the check. `postEntry` itself is atomic, so the
   *  wallet can never go negative or lose an entry — the exposure is a duplicate debit,
   *  which is visible in the ledger and reversible with a compensating entry. */
  async complete(id: string, dto: CompleteWithdrawalDto, adminId: string) {
    const withdrawal = await this.requireWithdrawal(id);
    if (!["approved", "processing"].includes(withdrawal.status)) {
      throw new BadRequestException(`Cannot complete a withdrawal in "${withdrawal.status}" status`);
    }

    const entry = await this.ledgerService.postEntry({
      walletId: withdrawal.walletId,
      direction: "debit",
      balanceType: "available",
      amountMinor: withdrawal.requestedAmountMinor,
      relatedEntityType: "Withdrawal",
      relatedEntityId: withdrawal.id,
      reason: `Withdrawal ${withdrawal.withdrawalCode} completed`,
      createdBy: adminId,
    });
    await this.ledgerService.incrementWalletTotals(withdrawal.walletId, {
      totalWithdrawnMinor: withdrawal.requestedAmountMinor,
    });

    const txn = await this.transactionService.recordWithdrawalDebit({
      merchantId: withdrawal.merchantId,
      amountMinor: withdrawal.requestedAmountMinor,
      ledgerEntryId: entry.id,
      withdrawalCode: withdrawal.withdrawalCode ?? withdrawal.id,
      createdBy: adminId,
    });

    const updated = await this.prisma.withdrawal.update({
      where: { id },
      data: {
        status: "completed",
        completedDate: new Date(),
        transactionId: txn.id,
        externalFeeAmountMinor: dto.externalFeeAmountMinor,
        externalFeeNote: dto.externalFeeNote || undefined,
      },
    });

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_status_change",
      targetType: "Withdrawal",
      targetId: id,
      transactionId: txn.id,
      subjectUserId: withdrawal.merchantId,
      oldValue: { status: withdrawal.status },
      newValue: { status: "completed", requestedAmountMinor: withdrawal.requestedAmountMinor },
    });
    return withAccountDetails(updated);
  }

  async cancel(id: string, dto: CancelWithdrawalDto, adminId: string) {
    const withdrawal = await this.requireWithdrawal(id);
    if (["completed", "rejected", "cancelled"].includes(withdrawal.status)) {
      throw new BadRequestException(`Cannot cancel a withdrawal in "${withdrawal.status}" status`);
    }

    const updated = await this.prisma.withdrawal.update({
      where: { id },
      data: { status: "cancelled", cancellationReason: dto.reason },
    });

    await this.auditLogService.record({
      adminId,
      action: "withdrawal_cancelled",
      targetType: "Withdrawal",
      targetId: id,
      subjectUserId: withdrawal.merchantId,
      oldValue: { status: withdrawal.status },
      newValue: { status: "cancelled" },
      reason: dto.reason,
    });
    return withAccountDetails(updated);
  }
}
