import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import { Wallet, WalletDocument, WalletType } from "./schema/wallet.schema";
import {
  WalletLedgerEntry,
  WalletLedgerEntryDocument,
  LedgerDirection,
  LedgerBalanceType,
  LedgerRelatedEntityType,
} from "./schema/wallet-ledger-entry.schema";
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

/** The core atomic ledger primitive everything else in the wallet module calls.
 *
 *  Every balance-changing write is a single-document `findOneAndUpdate` using an
 *  aggregation-pipeline update — atomic on any MongoDB topology (standalone, replica
 *  set, or sharded), no multi-document transaction required. The opening/closing
 *  balance recorded on the ledger entry is always taken directly from that same atomic
 *  op's pre-image, never from a separate read, so it can never be based on stale data.
 *  A debit that would take the balance negative, or that targets a frozen wallet, simply
 *  matches zero documents — the guard and the write are the same operation, so there is
 *  no race window between "check balance" and "apply balance" under concurrent callers.
 *
 *  Residual gap (documented, not eliminated): if the process crashes between the wallet-
 *  balance write and the ledger-entry insert, the two can momentarily disagree. There is
 *  no session/transaction usage anywhere in this codebase and replica-set support for the
 *  deployed MongoDB is unconfirmed, so `recalculateBalance` exists as a manual admin-
 *  triggered reconciliation safety net rather than relying on multi-document transactions. */
@Injectable()
export class WalletLedgerService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    @InjectModel(WalletLedgerEntry.name)
    private readonly ledgerModel: Model<WalletLedgerEntryDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
    private readonly walletSettingsService: WalletSettingsService,
  ) {}

  /** Wallet Settings' Daily Transaction Limit (spec §11) applies at this single choke point
   *  so it uniformly covers every money movement — manual add/deduct, withdrawal completion,
   *  and refund credit alike — rather than being re-implemented per calling service. */
  private async assertWithinDailyLimit(walletId: string, amountMinor: number): Promise<void> {
    const dailyLimit = await this.walletSettingsService.getDailyTransactionLimitMinor();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.ledgerModel.aggregate([
      { $match: { walletId: new Types.ObjectId(walletId), createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ]);
    const spentToday = result[0]?.total ?? 0;

    if (spentToday + amountMinor > dailyLimit) {
      throw new BadRequestException(
        `This would exceed the daily transaction limit (${dailyLimit} minor units) for this wallet`,
      );
    }
  }

  private async generateNextCode(counterKey: string, prefix: string): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      counterKey,
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `${prefix}-${String(counter.seq).padStart(6, "0")}`;
  }

  async getWalletById(walletId: string): Promise<WalletDocument> {
    if (!Types.ObjectId.isValid(walletId)) throw new NotFoundException("Wallet not found");
    const wallet = await this.walletModel.findById(walletId);
    if (!wallet) throw new NotFoundException("Wallet not found");
    return wallet;
  }

  async findWalletByOwner(ownerId: string, walletType: WalletType): Promise<WalletDocument | null> {
    if (!Types.ObjectId.isValid(ownerId)) return null;
    return this.walletModel.findOne({ ownerId: new Types.ObjectId(ownerId), walletType });
  }

  /** Lazy creation — a Wallet document is created on first balance-affecting action, not
   *  automatically at User signup, to avoid millions of empty wallets for users who never
   *  transact. Safe under concurrent first-actions: relies on the unique {ownerId,walletType}
   *  index, re-fetching on a duplicate-key race instead of erroring. */
  async getOrCreateWallet(ownerId: string, walletType: WalletType): Promise<WalletDocument> {
    if (!Types.ObjectId.isValid(ownerId)) throw new BadRequestException("Invalid owner id");
    const ownerObjectId = new Types.ObjectId(ownerId);

    const existing = await this.walletModel.findOne({ ownerId: ownerObjectId, walletType });
    if (existing) return existing;

    const walletCode = await this.generateNextCode("walletCode", "WLT");
    try {
      return await this.walletModel.create({ ownerId: ownerObjectId, walletType, walletCode });
    } catch {
      const createdByConcurrentRequest = await this.walletModel.findOne({
        ownerId: ownerObjectId,
        walletType,
      });
      if (createdByConcurrentRequest) return createdByConcurrentRequest;
      throw new BadRequestException("Failed to create wallet");
    }
  }

  /** Posts one append-only ledger entry and atomically applies its effect to the wallet's
   *  materialized balance in the same step. Throws BadRequestException for an invalid
   *  amount, a frozen-wallet debit attempt, or insufficient balance; NotFoundException if
   *  the wallet doesn't exist. */
  async postEntry(input: PostLedgerEntryInput): Promise<WalletLedgerEntryDocument> {
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      throw new BadRequestException("amountMinor must be a positive integer");
    }
    if (!Types.ObjectId.isValid(input.walletId)) {
      throw new NotFoundException("Wallet not found");
    }

    await this.assertWithinDailyLimit(input.walletId, input.amountMinor);

    const balanceField = input.balanceType === "available" ? "availableBalanceMinor" : "pendingBalanceMinor";
    const walletObjectId = new Types.ObjectId(input.walletId);

    let before: WalletDocument | null;
    if (input.direction === "credit") {
      before = await this.walletModel.findOneAndUpdate(
        { _id: walletObjectId },
        [{ $set: { [balanceField]: { $add: [`$${balanceField}`, input.amountMinor] } } }],
        { new: false },
      );
      if (!before) throw new NotFoundException("Wallet not found");
    } else {
      before = await this.walletModel.findOneAndUpdate(
        {
          _id: walletObjectId,
          isFrozen: { $ne: true },
          [balanceField]: { $gte: input.amountMinor },
        },
        [{ $set: { [balanceField]: { $subtract: [`$${balanceField}`, input.amountMinor] } } }],
        { new: false },
      );
      if (!before) {
        const wallet = await this.walletModel.findById(walletObjectId).lean();
        if (!wallet) throw new NotFoundException("Wallet not found");
        if (wallet.isFrozen) throw new BadRequestException("Wallet is frozen — cannot debit");
        throw new BadRequestException("Insufficient balance");
      }
    }

    const openingBalanceMinor = (before as unknown as Record<string, number>)[balanceField];
    const closingBalanceMinor =
      input.direction === "credit"
        ? openingBalanceMinor + input.amountMinor
        : openingBalanceMinor - input.amountMinor;

    const ledgerCode = await this.generateNextCode("walletLedgerCode", "LED");

    return this.ledgerModel.create({
      ledgerCode,
      walletId: walletObjectId,
      direction: input.direction,
      balanceType: input.balanceType,
      amountMinor: input.amountMinor,
      openingBalanceMinor,
      closingBalanceMinor,
      relatedTransactionId: input.relatedTransactionId
        ? new Types.ObjectId(input.relatedTransactionId)
        : null,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId ? new Types.ObjectId(input.relatedEntityId) : null,
      reason: input.reason ?? null,
      createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : null,
    });
  }

  /** Denormalized merchant-only lifetime counters — display-only, not part of the ledger's
   *  correctness guarantees, so a plain atomic $inc (no opening/closing tracking) is enough. */
  async incrementWalletTotals(
    walletId: string,
    deltas: { totalReceivedMinor?: number; totalWithdrawnMinor?: number },
  ): Promise<void> {
    const inc: Record<string, number> = {};
    if (deltas.totalReceivedMinor) inc.totalReceivedMinor = deltas.totalReceivedMinor;
    if (deltas.totalWithdrawnMinor) inc.totalWithdrawnMinor = deltas.totalWithdrawnMinor;
    if (Object.keys(inc).length === 0) return;
    await this.walletModel.updateOne({ _id: new Types.ObjectId(walletId) }, { $inc: inc });
  }

  async freezeWallet(walletId: string, reason: string, adminId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findByIdAndUpdate(
      walletId,
      {
        $set: {
          isFrozen: true,
          frozenReason: reason,
          frozenAt: new Date(),
          frozenBy: new Types.ObjectId(adminId),
        },
      },
      { new: true },
    );
    if (!wallet) throw new NotFoundException("Wallet not found");
    return wallet;
  }

  async unfreezeWallet(walletId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findByIdAndUpdate(
      walletId,
      { $set: { isFrozen: false, frozenReason: null, frozenAt: null, frozenBy: null } },
      { new: true },
    );
    if (!wallet) throw new NotFoundException("Wallet not found");
    return wallet;
  }

  async getLedgerPage(walletId: string, page = 1, limit = 10): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const filter = { walletId: new Types.ObjectId(walletId) };

    const [data, total] = await Promise.all([
      this.ledgerModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      this.ledgerModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /** Manual reconciliation safety net: sums every ledger entry for this wallet and repairs
   *  the materialized balance fields to match. Substitutes for automatic periodic
   *  reconciliation, since this backend has no cron/@nestjs/schedule infrastructure today. */
  async recalculateBalance(walletId: string): Promise<WalletDocument> {
    const walletObjectId = new Types.ObjectId(walletId);
    const wallet = await this.walletModel.findById(walletObjectId);
    if (!wallet) throw new NotFoundException("Wallet not found");

    const rows = await this.ledgerModel.aggregate([
      { $match: { walletId: walletObjectId } },
      {
        $group: {
          _id: { balanceType: "$balanceType", direction: "$direction" },
          total: { $sum: "$amountMinor" },
        },
      },
    ]);

    let availableBalanceMinor = 0;
    let pendingBalanceMinor = 0;
    for (const row of rows) {
      const sign = row._id.direction === "credit" ? 1 : -1;
      if (row._id.balanceType === "available") availableBalanceMinor += sign * row.total;
      else pendingBalanceMinor += sign * row.total;
    }

    wallet.availableBalanceMinor = availableBalanceMinor;
    wallet.pendingBalanceMinor = pendingBalanceMinor;
    await wallet.save();
    return wallet;
  }
}
