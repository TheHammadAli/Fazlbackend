import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const WALLET_TRANSACTION_TYPES = [
  "order_payment",
  "manual_credit",
  "manual_debit",
  "withdrawal_debit",
  "refund_credit",
] as const;
export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number];

export const WALLET_PAYMENT_METHODS = ["fazl_wallet", "cash"] as const;
export type WalletPaymentMethod = (typeof WALLET_PAYMENT_METHODS)[number];

export const WALLET_TRANSACTION_STATUSES = ["pending", "completed", "failed", "reversed"] as const;
export type WalletTransactionStatus = (typeof WALLET_TRANSACTION_STATUSES)[number];

export const WALLET_TRANSACTION_REFUND_STATUSES = ["none", "partial", "full"] as const;
export type WalletTransactionRefundStatus = (typeof WALLET_TRANSACTION_REFUND_STATUSES)[number];

export const WALLET_REF_MODELS = ["User", "Wallet"] as const;
export type WalletRefModel = (typeof WALLET_REF_MODELS)[number];

/** The business/reporting record behind Transaction Management (spec §5). Distinct from
 *  WalletLedgerEntry: one WalletTransaction can produce 0, 1 or 2 ledger entries depending
 *  on payment method (Cash moves no wallet balance; a wallet-to-wallet settlement debits
 *  one wallet and credits another). Deal/discount/margin fields are always a snapshot taken
 *  once at creation time — never re-derived from the live MerchantDeal later. */
@Schema({ collection: "wallet_transactions", timestamps: true })
export class WalletTransaction {
  _id: Types.ObjectId;

  @Prop({ unique: true, sparse: true, required: false })
  transactionCode?: string;

  @Prop({ type: String, enum: WALLET_TRANSACTION_TYPES, required: true })
  type: WalletTransactionType;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  merchantId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: "Order", default: null })
  orderId?: Types.ObjectId | null;

  @Prop({ type: Number, required: true, default: 0 })
  originalAmountMinor: number;

  @Prop({ type: Number, required: true, default: 0 })
  customerDiscountPercent: number;

  @Prop({ type: Number, required: true, default: 0 })
  customerDiscountAmountMinor: number;

  @Prop({ type: Number, required: true, default: 0 })
  finalCustomerPaymentMinor: number;

  @Prop({ type: Number, required: true, default: 0 })
  merchantDealPercent: number;

  @Prop({ type: Number, required: true, default: 0 })
  fazlMarginPercent: number;

  @Prop({ type: Number, required: true, default: 0 })
  fazlMarginAmountMinor: number;

  @Prop({ type: Number, required: true, default: 0 })
  merchantSettlementAmountMinor: number;

  @Prop({ type: Types.ObjectId, ref: "MerchantDeal", default: null })
  dealSnapshotId?: Types.ObjectId | null;

  @Prop({ type: String, enum: WALLET_PAYMENT_METHODS, required: true })
  paymentMethod: WalletPaymentMethod;

  @Prop({ type: String, enum: WALLET_REF_MODELS, default: null })
  senderRefType?: WalletRefModel | null;

  @Prop({ type: Types.ObjectId, refPath: "senderRefType", default: null })
  senderRefId?: Types.ObjectId | null;

  @Prop({ type: String, enum: WALLET_REF_MODELS, default: null })
  receiverRefType?: WalletRefModel | null;

  @Prop({ type: Types.ObjectId, refPath: "receiverRefType", default: null })
  receiverRefId?: Types.ObjectId | null;

  @Prop({ type: String, enum: WALLET_TRANSACTION_STATUSES, required: true, default: "completed" })
  status: WalletTransactionStatus;

  @Prop({ type: String, enum: WALLET_TRANSACTION_REFUND_STATUSES, required: true, default: "none" })
  refundStatus: WalletTransactionRefundStatus;

  @Prop({ type: [Types.ObjectId], ref: "WalletLedgerEntry", default: [] })
  ledgerEntryIds: Types.ObjectId[];

  @Prop({ type: String, default: null })
  reason?: string | null;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  createdBy?: Types.ObjectId | null;
}

export type WalletTransactionDocument = WalletTransaction & Document;
export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ merchantId: 1, createdAt: -1 });
WalletTransactionSchema.index({ status: 1, createdAt: -1 });
WalletTransactionSchema.index({ paymentMethod: 1 });
WalletTransactionSchema.index({ createdAt: -1 });
