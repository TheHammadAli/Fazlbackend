import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { Counter, CounterDocument } from "src/common/schema/counter.schema";
import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletTransactionRefundStatus,
} from "./schema/wallet-transaction.schema";
import { WalletType } from "./schema/wallet.schema";

export type WalletTransactionListFilters = {
  search?: string;
  status?: string;
  paymentMethod?: string;
  userId?: string;
  merchantId?: string;
  startDate?: string;
  endDate?: string;
};

/** Owns WalletTransaction — the business/reporting record behind Transaction Management
 *  (spec §5). Distinct from WalletLedgerEntry: every write here is paired with 1+ ledger
 *  entries already posted by the caller via WalletLedgerService; this service never moves
 *  balances itself, it only records what happened for search/reporting purposes. */
@Injectable()
export class WalletTransactionService {
  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly transactionModel: Model<WalletTransactionDocument>,
    @InjectModel(Counter.name) private readonly counterModel: Model<CounterDocument>,
  ) {}

  private async generateNextCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "walletTransactionCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `TXN-${String(counter.seq).padStart(6, "0")}`;
  }

  async recordManualAdjustment(input: {
    type: "manual_credit" | "manual_debit";
    ownerId: string;
    walletType: WalletType;
    amountMinor: number;
    reason: string;
    ledgerEntryId: string;
    createdBy: string;
  }): Promise<WalletTransactionDocument> {
    const transactionCode = await this.generateNextCode();
    const isCredit = input.type === "manual_credit";
    const ownerObjectId = new Types.ObjectId(input.ownerId);

    return this.transactionModel.create({
      transactionCode,
      type: input.type,
      userId: ownerObjectId,
      merchantId: input.walletType === "merchant" ? ownerObjectId : null,
      originalAmountMinor: input.amountMinor,
      finalCustomerPaymentMinor: isCredit ? input.amountMinor : 0,
      paymentMethod: "fazl_wallet",
      senderRefType: isCredit ? null : "User",
      senderRefId: isCredit ? null : ownerObjectId,
      receiverRefType: isCredit ? "User" : null,
      receiverRefId: isCredit ? ownerObjectId : null,
      status: "completed",
      ledgerEntryIds: [new Types.ObjectId(input.ledgerEntryId)],
      reason: input.reason,
      createdBy: new Types.ObjectId(input.createdBy),
    });
  }

  async recordWithdrawalDebit(input: {
    merchantId: string;
    amountMinor: number;
    ledgerEntryId: string;
    withdrawalCode: string;
    createdBy: string;
  }): Promise<WalletTransactionDocument> {
    const transactionCode = await this.generateNextCode();
    const merchantObjectId = new Types.ObjectId(input.merchantId);

    return this.transactionModel.create({
      transactionCode,
      type: "withdrawal_debit",
      userId: merchantObjectId,
      merchantId: merchantObjectId,
      originalAmountMinor: input.amountMinor,
      finalCustomerPaymentMinor: 0,
      paymentMethod: "fazl_wallet",
      senderRefType: "User",
      senderRefId: merchantObjectId,
      status: "completed",
      ledgerEntryIds: [new Types.ObjectId(input.ledgerEntryId)],
      reason: `Withdrawal ${input.withdrawalCode}`,
      createdBy: new Types.ObjectId(input.createdBy),
    });
  }

  async recordRefundCredit(input: {
    originalTransaction: WalletTransactionDocument;
    refundAmountMinor: number;
    ledgerEntryIds: string[];
    refundCode: string;
    createdBy: string;
  }): Promise<WalletTransactionDocument> {
    const transactionCode = await this.generateNextCode();
    const original = input.originalTransaction;

    return this.transactionModel.create({
      transactionCode,
      type: "refund_credit",
      userId: original.userId,
      merchantId: original.merchantId ?? null,
      orderId: original.orderId ?? null,
      originalAmountMinor: input.refundAmountMinor,
      finalCustomerPaymentMinor: input.refundAmountMinor,
      paymentMethod: original.paymentMethod,
      receiverRefType: "User",
      receiverRefId: original.userId,
      status: "completed",
      ledgerEntryIds: input.ledgerEntryIds.map((id) => new Types.ObjectId(id)),
      reason: `Refund ${input.refundCode}`,
      createdBy: new Types.ObjectId(input.createdBy),
    });
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
    throw new Error("recordOrderPayment is not wired to any live flow yet — see WalletModule scope notes");
  }

  async setRefundStatus(transactionId: string, refundStatus: WalletTransactionRefundStatus): Promise<void> {
    await this.transactionModel.updateOne(
      { _id: new Types.ObjectId(transactionId) },
      { $set: { refundStatus } },
    );
  }

  async requireById(id: string): Promise<WalletTransactionDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Transaction not found");
    const txn = await this.transactionModel.findById(id);
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

    const match: Record<string, any> = {};
    if (filters.status?.trim()) match.status = filters.status.trim();
    if (filters.paymentMethod?.trim()) match.paymentMethod = filters.paymentMethod.trim();
    if (filters.userId?.trim() && Types.ObjectId.isValid(filters.userId.trim())) {
      match.userId = new Types.ObjectId(filters.userId.trim());
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
      match.transactionCode = { $regex: escaped, $options: "i" };
    }

    const [data, total] = await Promise.all([
      this.transactionModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name email userCode")
        .populate("merchantId", "name email userCode")
        .lean(),
      this.transactionModel.countDocuments(match),
    ]);

    return {
      data,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getDetail(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Transaction not found");
    const txn = await this.transactionModel
      .findById(id)
      .populate("userId", "name email userCode")
      .populate("merchantId", "name email userCode")
      .populate("senderRefId", "name email userCode walletCode")
      .populate("receiverRefId", "name email userCode walletCode")
      .populate("ledgerEntryIds")
      .lean();
    if (!txn) throw new NotFoundException("Transaction not found");
    return txn;
  }
}
