import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const LEDGER_DIRECTIONS = ["credit", "debit"] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

export const LEDGER_BALANCE_TYPES = ["available", "pending"] as const;
export type LedgerBalanceType = (typeof LEDGER_BALANCE_TYPES)[number];

export const LEDGER_RELATED_ENTITY_TYPES = [
  "WalletTransaction",
  "Withdrawal",
  "Refund",
  "ManualAdjustment",
] as const;
export type LedgerRelatedEntityType = (typeof LEDGER_RELATED_ENTITY_TYPES)[number];

/** The append-only ledger core — every money movement creates one immutable row here.
 *  No service method ever updates or deletes a row; corrections are always new rows.
 *  Opening/closing balance are always taken from the same atomic write that moved the
 *  money, never from a separate read, so they can never be based on stale data. */
@Schema({ collection: "wallet_ledger_entries", timestamps: { createdAt: true, updatedAt: false } })
export class WalletLedgerEntry {
  _id: Types.ObjectId;

  @Prop({ unique: true, sparse: true, required: false })
  ledgerCode?: string;

  @Prop({ type: Types.ObjectId, ref: "Wallet", required: true })
  walletId: Types.ObjectId;

  @Prop({ type: String, enum: LEDGER_DIRECTIONS, required: true })
  direction: LedgerDirection;

  @Prop({ type: String, enum: LEDGER_BALANCE_TYPES, required: true })
  balanceType: LedgerBalanceType;

  @Prop({ type: Number, required: true })
  amountMinor: number;

  @Prop({ type: Number, required: true })
  openingBalanceMinor: number;

  @Prop({ type: Number, required: true })
  closingBalanceMinor: number;

  @Prop({ type: Types.ObjectId, ref: "WalletTransaction", default: null })
  relatedTransactionId?: Types.ObjectId | null;

  @Prop({ type: String, enum: LEDGER_RELATED_ENTITY_TYPES, required: true })
  relatedEntityType: LedgerRelatedEntityType;

  @Prop({ type: Types.ObjectId, default: null })
  relatedEntityId?: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  reason?: string | null;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  createdBy?: Types.ObjectId | null;
}

export type WalletLedgerEntryDocument = WalletLedgerEntry & Document;
export const WalletLedgerEntrySchema = SchemaFactory.createForClass(WalletLedgerEntry);

WalletLedgerEntrySchema.index({ walletId: 1, createdAt: -1 });
WalletLedgerEntrySchema.index({ relatedTransactionId: 1 });
