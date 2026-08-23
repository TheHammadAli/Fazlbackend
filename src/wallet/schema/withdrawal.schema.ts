import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const WITHDRAWAL_STATUSES = [
  "pending",
  "approved",
  "processing",
  "completed",
  "rejected",
  "cancelled",
] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const WITHDRAWAL_METHODS = ["bank_transfer", "jazzcash", "easypaisa", "other"] as const;
export type WithdrawalMethod = (typeof WITHDRAWAL_METHODS)[number];

export class WithdrawalAccountDetails {
  @Prop({ type: String, required: true })
  accountTitle: string;

  @Prop({ type: String, required: true })
  accountNumber: string;

  @Prop({ type: String, default: null })
  bankName?: string | null;

  @Prop({ type: String, default: null })
  iban?: string | null;
}

/** Full withdrawal state machine (spec §7). Fazl's own platform fee is always 0% —
 *  externalFeeAmountMinor is informational only (what the bank/provider took) and is
 *  never subtracted from requestedAmountMinor by this system. Every request is admin-
 *  entered on the merchant's behalf, since there's no merchant self-service UI yet. */
@Schema({ collection: "withdrawals", timestamps: true })
export class Withdrawal {
  _id: Types.ObjectId;

  @Prop({ unique: true, sparse: true, required: false })
  withdrawalCode?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  merchantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Wallet", required: true })
  walletId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  requestedAmountMinor: number;

  @Prop({ type: Number, required: true })
  availableBalanceSnapshotMinor: number;

  @Prop({ type: String, enum: WITHDRAWAL_METHODS, required: true })
  withdrawalMethod: WithdrawalMethod;

  @Prop({ type: WithdrawalAccountDetails, required: true })
  accountDetails: WithdrawalAccountDetails;

  @Prop({ type: String, enum: WITHDRAWAL_STATUSES, required: true, default: "pending" })
  status: WithdrawalStatus;

  @Prop({ type: Date, default: null })
  processingDate?: Date | null;

  @Prop({ type: Date, default: null })
  completedDate?: Date | null;

  @Prop({ type: Types.ObjectId, ref: "WalletTransaction", default: null })
  transactionId?: Types.ObjectId | null;

  @Prop({ type: Number, required: true, default: 0 })
  platformFeePercent: number;

  @Prop({ type: Number, default: null })
  externalFeeAmountMinor?: number | null;

  @Prop({ type: String, default: null })
  externalFeeNote?: string | null;

  @Prop({ type: String, default: null })
  rejectionReason?: string | null;

  @Prop({ type: String, default: null })
  cancellationReason?: string | null;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export type WithdrawalDocument = Withdrawal & Document;
export const WithdrawalSchema = SchemaFactory.createForClass(Withdrawal);

WithdrawalSchema.index({ status: 1, createdAt: -1 });
WithdrawalSchema.index({ merchantId: 1, createdAt: -1 });
