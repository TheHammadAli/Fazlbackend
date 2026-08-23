import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export const WALLET_AUDIT_ACTIONS = [
  "manual_balance_addition",
  "manual_balance_deduction",
  "wallet_freeze",
  "wallet_unfreeze",
  "refund",
  "refund_rejection",
  "withdrawal_created",
  "withdrawal_approval",
  "withdrawal_rejection",
  "withdrawal_status_change",
  "withdrawal_cancelled",
  "deal_change",
  "wallet_settings_change",
  "wallet_recalculated",
] as const;
export type WalletAuditAction = (typeof WALLET_AUDIT_ACTIONS)[number];

export const WALLET_AUDIT_TARGET_TYPES = [
  "Wallet",
  "WalletTransaction",
  "Withdrawal",
  "Refund",
  "MerchantDeal",
  "WalletSettings",
] as const;
export type WalletAuditTargetType = (typeof WALLET_AUDIT_TARGET_TYPES)[number];

/** Dedicated audit trail for every wallet-admin action (spec §9/§10). Deliberately separate
 *  from the generic ActivityLog: that schema has no structured oldValue/newValue/reason/
 *  transactionId fields and closed enums that don't cover wallet concepts. Append-only — no
 *  update/delete method is ever exposed on WalletAuditLogService. Unlike ActivityLogService's
 *  fire-and-forget "never break the real action" write, a failed write here should be logged
 *  loudly (a missing audit entry for a balance change is itself a compliance gap), even though
 *  it still must not roll back the underlying wallet action that already succeeded. */
@Schema({ collection: "wallet_audit_logs", timestamps: { createdAt: true, updatedAt: false } })
export class WalletAuditLog {
  @Prop({ unique: true, sparse: true, required: false })
  logCode?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  adminId: Types.ObjectId;

  @Prop({ type: String, enum: WALLET_AUDIT_ACTIONS, required: true })
  action: WalletAuditAction;

  @Prop({ type: String, enum: WALLET_AUDIT_TARGET_TYPES, required: true })
  targetType: WalletAuditTargetType;

  // Plain string, not ObjectId — most targets are real documents, but WalletSettings uses
  // a fixed singleton _id ("wallet-settings") that isn't a valid ObjectId.
  @Prop({ type: String, required: true })
  targetId: string;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  subjectUserId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: "WalletTransaction", default: null })
  transactionId?: Types.ObjectId | null;

  @Prop({ type: Object, default: null })
  oldValue?: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  newValue?: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  reason?: string | null;

  @Prop({ type: String, default: null })
  ipAddress?: string | null;
}

export type WalletAuditLogDocument = WalletAuditLog & Document;
export const WalletAuditLogSchema = SchemaFactory.createForClass(WalletAuditLog);

WalletAuditLogSchema.index({ subjectUserId: 1, createdAt: -1 });
WalletAuditLogSchema.index({ adminId: 1, createdAt: -1 });
WalletAuditLogSchema.index({ action: 1, createdAt: -1 });
WalletAuditLogSchema.index({ targetType: 1, targetId: 1 });
