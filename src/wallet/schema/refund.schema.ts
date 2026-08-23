import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const REFUND_STATUSES = ["pending", "completed", "rejected"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

/** Simple one-step refund workflow (spec §8, confirmed with stakeholder — not a multi-stage
 *  approval chain like Withdrawals). Creating a refund immediately posts the reversing/
 *  crediting ledger entry and marks it completed, or it's rejected with a reason. The spec's
 *  "Admin/Action Log" field is intentionally NOT duplicated here — it's derived by querying
 *  WalletAuditLog filtered by targetType:"Refund", targetId to avoid a second source of truth. */
@Schema({ collection: "refunds", timestamps: true })
export class Refund {
  _id: Types.ObjectId;

  @Prop({ unique: true, sparse: true, required: false })
  refundCode?: string;

  @Prop({ type: Types.ObjectId, ref: "WalletTransaction", required: true })
  originalTransactionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Order", default: null })
  orderId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  merchantId?: Types.ObjectId | null;

  @Prop({ type: Number, required: true })
  refundAmountMinor: number;

  @Prop({ type: String, required: true })
  refundReason: string;

  @Prop({ type: String, enum: REFUND_STATUSES, required: true, default: "pending" })
  refundStatus: RefundStatus;

  @Prop({ type: [Types.ObjectId], ref: "WalletLedgerEntry", default: [] })
  ledgerEntryIds: Types.ObjectId[];

  @Prop({ type: String, default: null })
  rejectionReason?: string | null;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;
}

export type RefundDocument = Refund & Document;
export const RefundSchema = SchemaFactory.createForClass(Refund);

RefundSchema.index({ refundStatus: 1, createdAt: -1 });
RefundSchema.index({ customerId: 1, createdAt: -1 });
RefundSchema.index({ merchantId: 1, createdAt: -1 });
RefundSchema.index({ originalTransactionId: 1 });
