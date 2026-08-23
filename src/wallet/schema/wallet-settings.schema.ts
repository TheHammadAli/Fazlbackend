import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** Singleton wallet-wide configuration (spec §11) — mirrors SiteSettings' fixed-`_id`
 *  singleton pattern, kept in its own collection so it scopes to the "wallet" permission
 *  rather than mixing into the generic site_settings collection. */
@Schema({ collection: "wallet_settings", timestamps: true })
export class WalletSettings {
  @Prop({ required: true })
  _id: string;

  @Prop({ type: Number, required: true, default: 10000 })
  minTopUpAmountMinor: number;

  @Prop({ type: Number, required: true, default: 100000000 })
  maxTopUpAmountMinor: number;

  @Prop({ type: Number, required: true, default: 50000 })
  minWithdrawalAmountMinor: number;

  @Prop({ type: Number, required: true, default: 100000000 })
  maxWithdrawalAmountMinor: number;

  @Prop({ type: Number, required: true, default: 500000000 })
  dailyTransactionLimitMinor: number;

  @Prop({ type: Boolean, required: true, default: true })
  walletStatus: boolean;

  @Prop({ type: Boolean, required: true, default: true })
  withdrawalStatus: boolean;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  updatedBy?: Types.ObjectId | null;
}

export type WalletSettingsDocument = WalletSettings & Document;
export const WalletSettingsSchema = SchemaFactory.createForClass(WalletSettings);
