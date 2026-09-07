import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { COUNTER_KEYS } from "src/common/model/counter.model";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import {
  LedgerBalanceType,
  LedgerDirection,
  LedgerRelatedEntityType,
  Wallet,
  WalletLedgerEntry,
  WalletType,
} from "./model/wallet.model";
import { WalletSettingsService } from "./wallet-settings.service";

export type PostLedgerEntryInput = {
  walletId: string;
  direction: LedgerDirection;
  balanceType: LedgerBalanceType;
  amountMinor: number;
  relatedEntityType: LedgerRelatedEntityType;
  relatedEntityId?: string | null;
  relatedTransactionId?: string | null;
  reason?: string | null;
  createdBy?: string | null;
};

/** The two balance columns a ledger entry may move, as a closed literal map.
 *  `Prisma.raw` cannot parameterise an identifier, so the column name is
 *  interpolated — this map is the reason no caller-supplied string ever
 *  reaches it. */
const BALANCE_COLUMNS: Record<LedgerBalanceType, string> = {
  available: "available_balance_minor",
  pending: "pending_balance_minor",
};

/** The core atomic ledger primitive everything else in the wallet module calls.
 *
 *  `postEntry` runs the balance move and the ledger insert inside one Postgres
 *  transaction, so the materialized balance and the append-only ledger can never
 *  disagree — a crash at any point rolls both back together. (Under Mongo these
 *  were two independent writes with a documented window between them, which is
 *  why `recalculateBalance` had to exist as a reconciliation net; it is kept
 *  below, but now only as an admin tool rather than a required safety valve.)
 *
 *  The balance move itself is a single conditional `UPDATE ... RETURNING`: the
 *  guard (sufficient balance, wallet not frozen) and the write are the same
 *  statement, so there is no window between "check balance" and "apply balance"
 *  under concurrent callers, and the opening/closing balances recorded on the
 *  entry come from that same statement rather than a separate read. */
@Injectable()
export class WalletLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletSettingsService: WalletSettingsService,
  ) {}

  private async generateNextCode(
    client: Prisma.TransactionClient,
    counterKey: string,
    prefix: string,
  ): Promise<string> {
    const counter = await client.counter.upsert({
      where: { id: counterKey },
      create: { id: counterKey, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `${prefix}-${String(counter.seq).padStart(6, "0")}`;
  }

  async getWalletById(walletId: string): Promise<Wallet> {
    if (!isObjectIdLike(walletId)) throw new NotFoundException("Wallet not found");
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException("Wallet not found");
    return wallet;
  }

  async findWalletByOwner(ownerId: string, walletType: WalletType): Promise<Wallet | null> {
    if (!isObjectIdLike(ownerId)) return null;
    return this.prisma.wallet.findUnique({
      where: { ownerId_walletType: { ownerId, walletType } },
    });
  }

  /** Lazy creation — a wallet row is created on first balance-affecting action, not
   *  automatically at signup, to avoid millions of empty wallets for users who never
   *  transact. Safe under concurrent first-actions: relies on the unique
   *  (owner_id, wallet_type) index, re-fetching on a duplicate-key race instead of erroring. */
  async getOrCreateWallet(ownerId: string, walletType: WalletType): Promise<Wallet> {
    if (!isObjectIdLike(ownerId)) throw new BadRequestException("Invalid owner id");

    const existing = await this.findWalletByOwner(ownerId, walletType);
    if (existing) return existing;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const walletCode = await this.generateNextCode(tx, COUNTER_KEYS.wallet, "WLT");
        return tx.wallet.create({
          data: { id: generateObjectId(), ownerId, walletType, walletCode },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const createdByConcurrentRequest = await this.findWalletByOwner(ownerId, walletType);
        if (createdByConcurrentRequest) return createdByConcurrentRequest;
      }
      throw new BadRequestException("Failed to create wallet");
    }
  }

  /** Wallet Settings' Daily Transaction Limit (spec §11) applies at this single choke point
   *  so it uniformly covers every money movement — manual add/deduct, withdrawal completion,
   *  and refund credit alike — rather than being re-implemented per calling service.
   *
   *  Runs inside `postEntry`'s transaction, so two concurrent posts cannot both read a
   *  below-limit total and then both commit past it. */
  private async assertWithinDailyLimit(
    tx: Prisma.TransactionClient,
    walletId: string,
    amountMinor: number,
    dailyLimit: number,
  ): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { _sum } = await tx.walletLedgerEntry.aggregate({
      where: { walletId, createdAt: { gte: startOfDay } },
      _sum: { amountMinor: true },
    });
    const spentToday = _sum.amountMinor ?? 0;

    if (spentToday + amountMinor > dailyLimit) {
      throw new BadRequestException(
        `This would exceed the daily transaction limit (${dailyLimit} minor units) for this wallet`,
      );
    }
  }

  /** Applies a balance change and records the entry that describes it, atomically.
   *  Throws BadRequestException for an invalid amount, a frozen-wallet debit attempt,
   *  insufficient balance, or a breach of the daily limit; NotFoundException if the
   *  wallet doesn't exist. */
  async postEntry(input: PostLedgerEntryInput): Promise<WalletLedgerEntry> {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new BadRequestException("amountMinor must be a positive integer");
    }
    if (!isObjectIdLike(input.walletId)) {
      throw new NotFoundException("Wallet not found");
    }

    // Read outside the transaction: the settings singleton is effectively static, and
    // keeping it out avoids adding a second row to every ledger transaction's lock set.
    const dailyLimit = await this.walletSettingsService.getDailyTransactionLimitMinor();

    const column = Prisma.raw(BALANCE_COLUMNS[input.balanceType]);
    const { walletId, amountMinor, direction } = input;

    return this.prisma.$transaction(async (tx) => {
      await this.assertWithinDailyLimit(tx, walletId, amountMinor, dailyLimit);

      // RETURNING hands back the post-update value, so the closing balance is read
      // from the very statement that produced it and the opening balance follows.
      const moved =
        direction === "credit"
          ? await tx.$queryRaw<{ balance: number }[]>`
              UPDATE wallets
                 SET ${column} = ${column} + ${amountMinor},
                     updated_at = now()
               WHERE id = ${walletId}
              RETURNING ${column} AS balance
            `
          : await tx.$queryRaw<{ balance: number }[]>`
              UPDATE wallets
                 SET ${column} = ${column} - ${amountMinor},
                     updated_at = now()
               WHERE id = ${walletId}
                 AND is_frozen = false
                 AND ${column} >= ${amountMinor}
              RETURNING ${column} AS balance
            `;

      if (moved.length === 0) {
        // Nothing matched. Re-read to say *why*, rather than reporting a generic failure.
        const wallet = await tx.wallet.findUnique({
          where: { id: walletId },
          select: { isFrozen: true },
        });
        if (!wallet) throw new NotFoundException("Wallet not found");
        if (direction === "debit" && wallet.isFrozen) {
          throw new BadRequestException("Wallet is frozen — cannot debit");
        }
        throw new BadRequestException("Insufficient balance");
      }

      const closingBalanceMinor = moved[0].balance;
      const openingBalanceMinor =
        direction === "credit"
          ? closingBalanceMinor - amountMinor
          : closingBalanceMinor + amountMinor;

      const ledgerCode = await this.generateNextCode(tx, COUNTER_KEYS.walletLedger, "LED");

      return tx.walletLedgerEntry.create({
        data: {
          id: generateObjectId(),
          ledgerCode,
          walletId,
          direction,
          balanceType: input.balanceType,
          amountMinor,
          openingBalanceMinor,
          closingBalanceMinor,
          relatedTransactionId: input.relatedTransactionId ?? null,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId ?? null,
          reason: input.reason ?? null,
          createdById: input.createdBy ?? null,
        },
      });
    });
  }

  /** Denormalized merchant-only lifetime counters — display-only, not part of the ledger's
   *  correctness guarantees, so a plain atomic increment (no opening/closing tracking) is enough. */
  async incrementWalletTotals(
    walletId: string,
    deltas: { totalReceivedMinor?: number; totalWithdrawnMinor?: number },
  ): Promise<void> {
    const data: Prisma.WalletUpdateInput = {};
    if (deltas.totalReceivedMinor) {
      data.totalReceivedMinor = { increment: deltas.totalReceivedMinor };
    }
    if (deltas.totalWithdrawnMinor) {
      data.totalWithdrawnMinor = { increment: deltas.totalWithdrawnMinor };
    }
    if (Object.keys(data).length === 0) return;
    await this.prisma.wallet.update({ where: { id: walletId }, data });
  }

  async freezeWallet(walletId: string, reason: string, adminId: string): Promise<Wallet> {
    if (!isObjectIdLike(walletId)) throw new NotFoundException("Wallet not found");
    try {
      return await this.prisma.wallet.update({
        where: { id: walletId },
        data: {
          isFrozen: true,
          frozenReason: reason,
          frozenAt: new Date(),
          frozenById: adminId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        throw new NotFoundException("Wallet not found");
      }
      throw err;
    }
  }

  async unfreezeWallet(walletId: string): Promise<Wallet> {
    if (!isObjectIdLike(walletId)) throw new NotFoundException("Wallet not found");
    try {
      return await this.prisma.wallet.update({
        where: { id: walletId },
        data: { isFrozen: false, frozenReason: null, frozenAt: null, frozenById: null },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        throw new NotFoundException("Wallet not found");
      }
      throw err;
    }
  }

  async getLedgerPage(walletId: string, page = 1, limit = 10): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      this.prisma.walletLedgerEntry.findMany({
        where: { walletId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      this.prisma.walletLedgerEntry.count({ where: { walletId } }),
    ]);

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /** Admin reconciliation tool: sums every ledger entry for this wallet and repairs the
   *  materialized balance fields to match. With `postEntry` transactional the two can no
   *  longer drift on their own, so this is now a repair path for balances corrected by
   *  hand in the database rather than a routine safety net. */
  async recalculateBalance(walletId: string): Promise<Wallet> {
    if (!isObjectIdLike(walletId)) throw new NotFoundException("Wallet not found");

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new NotFoundException("Wallet not found");

      const rows = await tx.walletLedgerEntry.groupBy({
        by: ["balanceType", "direction"],
        where: { walletId },
        _sum: { amountMinor: true },
      });

      let availableBalanceMinor = 0;
      let pendingBalanceMinor = 0;
      for (const row of rows) {
        const signed = (row.direction === "credit" ? 1 : -1) * (row._sum.amountMinor ?? 0);
        if (row.balanceType === "available") availableBalanceMinor += signed;
        else pendingBalanceMinor += signed;
      }

      return tx.wallet.update({
        where: { id: walletId },
        data: { availableBalanceMinor, pendingBalanceMinor },
      });
    });
  }
}
