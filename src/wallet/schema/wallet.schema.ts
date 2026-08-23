import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const WALLET_TYPES = ["user", "merchant"] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

/** One document per (ownerId, walletType) — a User can hold both a "user" wallet
 *  (buyer/spender) and a "merchant" wallet (seller/service-provider settlement)
 *  at the same time. Merchant wallets are keyed by User, never by Shop, since a
 *  Shop always resolves back to an owning User and standalone service providers
 *  have no Shop at all — this is what makes it "the same wallet system" for both
 *  Merchants and Service Providers. */
@Schema({ collection: "wallets", timestamps: true })
export class Wallet {
  // Plain field (no @Prop) purely so TS resolves `_id` as ObjectId instead of `unknown`
  // on Document instances — Mongoose still manages the real _id automatically.
  _id: Types.ObjectId;

  @Prop({ unique: true, sparse: true, required: false })
  walletCode?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: String, enum: WALLET_TYPES, required: true })
  walletType: WalletType;

  @Prop({ type: Number, required: true, default: 0 })
  availableBalanceMinor: number;

  @Prop({ type: Number, required: true, default: 0 })
  pendingBalanceMinor: number;

  /** Merchant-only lifetime running totals, denormalized for fast display. */
  @Prop({ type: Number, required: true, default: 0 })
  totalReceivedMinor: number;

  @Prop({ type: Number, required: true, default: 0 })
  totalWithdrawnMinor: number;

  @Prop({ type: Boolean, default: false })
  isFrozen: boolean;

  @Prop({ type: String, default: null })
  frozenReason?: string | null;

  @Prop({ type: Date, default: null })
  frozenAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  frozenBy?: Types.ObjectId | null;

  @Prop({ type: String, default: "PKR" })
  currency: string;
}

export type WalletDocument = Wallet & Document;
export const WalletSchema = SchemaFactory.createForClass(Wallet);

WalletSchema.index({ ownerId: 1, walletType: 1 }, { unique: true });
WalletSchema.index({ walletType: 1, isFrozen: 1 });
