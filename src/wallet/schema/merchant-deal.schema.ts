import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** Append-only version history of a merchant's commercial deal (spec §4). A deal row is
 *  never updated in place — changing terms closes the active row (sets effectiveTo) and
 *  inserts a brand-new one. merchantDealPercent is always server-computed as
 *  customerDiscountPercent + fazlMarginPercent, never accepted from the client, so the two
 *  can never disagree. Transactions snapshot these percentages at creation time (see
 *  WalletTransaction.dealSnapshotId) so later edits here never alter historical records. */
@Schema({ collection: "merchant_deals", timestamps: true })
export class MerchantDeal {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  merchantId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  customerDiscountPercent: number;

  @Prop({ type: Number, required: true })
  fazlMarginPercent: number;

  @Prop({ type: Number, required: true })
  merchantDealPercent: number;

  @Prop({ type: Date, required: true })
  effectiveFrom: Date;

  @Prop({ type: Date, default: null })
  effectiveTo?: Date | null;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: String, default: null })
  reason?: string | null;
}

export type MerchantDealDocument = MerchantDeal & Document;
export const MerchantDealSchema = SchemaFactory.createForClass(MerchantDeal);

MerchantDealSchema.index({ merchantId: 1, createdAt: -1 });
// At most one active (effectiveTo: null) deal per merchant, enforced at the DB layer.
MerchantDealSchema.index(
  { merchantId: 1 },
  { unique: true, partialFilterExpression: { effectiveTo: null } },
);
