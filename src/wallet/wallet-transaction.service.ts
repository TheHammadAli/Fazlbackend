import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { COUNTER_KEYS } from "src/common/model/counter.model";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import {
  WALLET_PAYMENT_METHODS,
  WALLET_TRANSACTION_STATUSES,
  WalletPaymentMethod,
  WalletTransaction,
  WalletTransactionRefundStatus,
  WalletTransactionStatus,
  WalletType,
} from "./model/wallet.model";

export type WalletTransactionListFilters = {
  search?: string;
  status?: string;
  paymentMethod?: string;
  userId?: string;
  merchantId?: string;
  startDate?: string;
  endDate?: string;
};

const partySelect = {
  id: true,
  name: true,
  email: true,
  userCode: true,
} satisfies Prisma.UserSelect;

/** Owns WalletTransaction — the business/reporting record behind Transaction Management
 *  (spec §5). Distinct from WalletLedgerEntry: every write here is paired with 1+ ledger
 *  entries already posted by the caller via WalletLedgerService; this service never moves
 *  balances itself, it only records what happened for search/reporting purposes.
 *
 *  Mongo stored the transaction→ledger link on both sides (`ledgerEntryIds` here and
 *  `relatedTransactionId` there). Postgres keeps only the foreign key on
 *  WalletLedgerEntry, so each `record*` method below back-fills it in the same
 *  transaction that creates the row, and the pair can never half-apply. */
@Injectable()
export class WalletTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateNextCode(client: Prisma.TransactionClient): Promise<string> {
    const counter = await client.counter.upsert({
      where: { id: COUNTER_KEYS.walletTransaction },
      create: { id: COUNTER_KEYS.walletTransaction, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `TXN-${String(counter.seq).padStart(6, "0")}`;
  }

  /** Creates the transaction row and points the ledger entries it accounts for back at
   *  it, atomically. */
  private async createLinked(
    ledgerEntryIds: string[],
    build: (transactionCode: string, id: string) => Prisma.WalletTransactionCreateInput,
  ): Promise<WalletTransaction> {
    return this.prisma.$transaction(async (tx) => {
      const transactionCode = await this.generateNextCode(tx);
      const created = await tx.walletTransaction.create({
        data: build(transactionCode, generateObjectId()),
      });
      if (ledgerEntryIds.length > 0) {
        await tx.walletLedgerEntry.updateMany({
          where: { id: { in: ledgerEntryIds } },
          data: { relatedTransactionId: created.id },
        });
      }
      return created;
    });
  }

  async recordManualAdjustment(input: {
    type: "manual_credit" | "manual_debit";
    ownerId: string;
    walletType: WalletType;
    amountMinor: number;
    reason: string;
    ledgerEntryId: string;
    createdBy: string;
  }): Promise<WalletTransaction> {
    const isCredit = input.type === "manual_credit";

    return this.createLinked([input.ledgerEntryId], (transactionCode, id) => ({
      id,
      transactionCode,
      type: input.type,
      user: { connect: { id: input.ownerId } },
      merchant:
        input.walletType === "merchant" ? { connect: { id: input.ownerId } } : undefined,
      originalAmountMinor: input.amountMinor,
      finalCustomerPaymentMinor: isCredit ? input.amountMinor : 0,
      paymentMethod: "fazl_wallet",
      senderRefType: isCredit ? null : "User",
      senderRefId: isCredit ? null : input.ownerId,
      receiverRefType: isCredit ? "User" : null,
      receiverRefId: isCredit ? input.ownerId : null,
      status: "completed",
      reason: input.reason,
      createdBy: { connect: { id: input.createdBy } },
    }));
  }

  async recordWithdrawalDebit(input: {
    merchantId: string;
    amountMinor: number;
    ledgerEntryId: string;
    withdrawalCode: string;
    createdBy: string;
  }): Promise<WalletTransaction> {
    return this.createLinked([input.ledgerEntryId], (transactionCode, id) => ({
      id,
      transactionCode,
      type: "withdrawal_debit",
      user: { connect: { id: input.merchantId } },
      merchant: { connect: { id: input.merchantId } },
      originalAmountMinor: input.amountMinor,
      finalCustomerPaymentMinor: 0,
      paymentMethod: "fazl_wallet",
      senderRefType: "User",
      senderRefId: input.merchantId,
      status: "completed",
      reason: `Withdrawal ${input.withdrawalCode}`,
      createdBy: { connect: { id: input.createdBy } },
    }));
  }

  async recordRefundCredit(input: {
    originalTransaction: WalletTransaction;
    refundAmountMinor: number;
    ledgerEntryIds: string[];
    refundCode: string;
    createdBy: string;
  }): Promise<WalletTransaction> {
    const original = input.originalTransaction;

    return this.createLinked(input.ledgerEntryIds, (transactionCode, id) => ({
      id,
      transactionCode,
      type: "refund_credit",
      user: { connect: { id: original.userId } },
      merchant: original.merchantId ? { connect: { id: original.merchantId } } : undefined,
      order: original.orderId ? { connect: { id: original.orderId } } : undefined,
      originalAmountMinor: input.refundAmountMinor,
      finalCustomerPaymentMinor: input.refundAmountMinor,
      paymentMethod: original.paymentMethod,
      receiverRefType: "User",
      receiverRefId: original.userId,
      status: "completed",
      reason: `Refund ${input.refundCode}`,
      createdBy: { connect: { id: input.createdBy } },
    }));
  }

  /** Left unused by any controller today — the documented seam for wiring real Order
   *  payments into the wallet ledger once an online payment method actually exists.
   *  Building the caller side now would be speculative against undefined future
   *  payment-integration requirements (confirmed self-contained scope decision). */
  async recordOrderPayment(_input: {
    orderId: string;
    userId: string;
    merchantId: string;
    originalAmountMinor: number;
    dealSnapshotId: string;
    customerDiscountPercent: number;
    fazlMarginPercent: number;
    merchantDealPercent: number;
    ledgerEntryIds: string[];
  }): Promise<never> {
    throw new Error(
      "recordOrderPayment is not wired to any live flow yet — see WalletModule scope notes",
    );
  }

  async setRefundStatus(
    transactionId: string,
    refundStatus: WalletTransactionRefundStatus,
  ): Promise<void> {
    await this.prisma.walletTransaction.updateMany({
      where: { id: transactionId },
      data: { refundStatus },
    });
  }

  async requireById(id: string): Promise<WalletTransaction> {
    if (!isObjectIdLike(id)) throw new NotFoundException("Transaction not found");
    const txn = await this.prisma.walletTransaction.findUnique({ where: { id } });
    if (!txn) throw new NotFoundException("Transaction not found");
    return txn;
  }

  async getList(
    filters: WalletTransactionListFilters,
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

    const where: Prisma.WalletTransactionWhereInput = {};

    // An unrecognised enum value is a Prisma validation error rather than a query that
    // matches nothing, so it short-circuits to an empty page instead.
    const status = filters.status?.trim();
    if (status) {
      if (!(WALLET_TRANSACTION_STATUSES as readonly string[]).includes(status)) return emptyPage;
      where.status = status as WalletTransactionStatus;
    }

    const paymentMethod = filters.paymentMethod?.trim();
    if (paymentMethod) {
      if (!(WALLET_PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) return emptyPage;
      where.paymentMethod = paymentMethod as WalletPaymentMethod;
    }

    const userId = filters.userId?.trim();
    if (userId && isObjectIdLike(userId)) where.userId = userId;

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
      where.transactionCode = { contains: search, mode: "insensitive" };
    }

    const [rows, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          user: { select: partySelect },
          merchant: { select: partySelect },
        },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      // `.populate("userId")` REPLACED the id with the object; `include` adds a
      // sibling and leaves the id a string. Renaming back keeps the wire format
      // the admin panel already parses.
      data: rows.map(({ user, merchant, ...r }) => ({
        ...r,
        userId: user,
        merchantId: merchant,
      })),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getDetail(id: string): Promise<any> {
    if (!isObjectIdLike(id)) throw new NotFoundException("Transaction not found");
    const txn = await this.prisma.walletTransaction.findUnique({
      where: { id },
      include: {
        user: { select: partySelect },
        merchant: { select: partySelect },
        ledgerEntries: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!txn) throw new NotFoundException("Transaction not found");

    // senderRef/receiverRef are audit snapshots, not foreign keys — Mongo resolved them
    // with a refPath populate, so they are looked up by hand against whichever table the
    // recorded ref type names.
    const [senderRef, receiverRef] = await Promise.all([
      this.resolveRef(txn.senderRefType, txn.senderRefId),
      this.resolveRef(txn.receiverRefType, txn.receiverRefId),
    ]);

    // Every one of these five was a `.populate(...)` that replaced the id field
    // in place, so each relation is renamed back onto the field it came from.
    const { user, merchant, ledgerEntries, ...rest } = txn;
    return {
      ...rest,
      userId: user,
      merchantId: merchant,
      senderRefId: senderRef,
      receiverRefId: receiverRef,
      ledgerEntryIds: ledgerEntries,
    };
  }

  private async resolveRef(
    refType: "User" | "Wallet" | null,
    refId: string | null,
  ): Promise<Record<string, unknown> | null> {
    if (!refType || !refId) return null;
    if (refType === "User") {
      return this.prisma.user.findUnique({ where: { id: refId }, select: partySelect });
    }
    return this.prisma.wallet.findUnique({
      where: { id: refId },
      select: { id: true, walletCode: true, walletType: true },
    });
  }
}
