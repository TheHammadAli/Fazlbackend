import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Wallet as WalletRow,
  WalletLedgerEntry as WalletLedgerEntryRow,
  WalletTransaction as WalletTransactionRow,
  Withdrawal as WithdrawalRow,
  Refund as RefundRow,
  MerchantDeal as MerchantDealRow,
  WalletSettings as WalletSettingsRow,
  WalletAuditLog as WalletAuditLogRow,
  $Enums,
} from "../../../generated/prisma/client";

/**
 * Module model file — replaces all eight files under wallet/schema:
 * wallet.schema.ts, wallet-ledger-entry.schema.ts, wallet-transaction.schema.ts,
 * withdrawal.schema.ts, refund.schema.ts, merchant-deal.schema.ts,
 * wallet-settings.schema.ts and wallet-audit-log.schema.ts.
 *
 * The row types come straight from the generated client, so a schema change is
 * a compile error here rather than a runtime surprise. The `as const satisfies`
 * on each constant array is what keeps the DTO-facing string unions from
 * drifting away from the Postgres enums they mirror.
 */

export type Wallet = WalletRow;
export type WalletLedgerEntry = WalletLedgerEntryRow;
export type WalletTransaction = WalletTransactionRow;
export type Withdrawal = WithdrawalRow;
export type Refund = RefundRow;
export type MerchantDeal = MerchantDealRow;
export type WalletSettings = WalletSettingsRow;
export type WalletAuditLog = WalletAuditLogRow;

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const WALLET_TYPES = ["user", "merchant"] as const satisfies readonly $Enums.WalletType[];
export type WalletType = (typeof WALLET_TYPES)[number];

export const LEDGER_DIRECTIONS = [
  "credit",
  "debit",
] as const satisfies readonly $Enums.LedgerDirection[];
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

export const LEDGER_BALANCE_TYPES = [
  "available",
  "pending",
] as const satisfies readonly $Enums.LedgerBalanceType[];
export type LedgerBalanceType = (typeof LEDGER_BALANCE_TYPES)[number];

export const LEDGER_RELATED_ENTITY_TYPES = [
  "WalletTransaction",
  "Withdrawal",
  "Refund",
  "ManualAdjustment",
] as const satisfies readonly $Enums.LedgerRelatedEntityType[];
export type LedgerRelatedEntityType = (typeof LEDGER_RELATED_ENTITY_TYPES)[number];

export const WALLET_TRANSACTION_TYPES = [
  "order_payment",
  "manual_credit",
  "manual_debit",
  "withdrawal_debit",
  "refund_credit",
] as const satisfies readonly $Enums.WalletTransactionType[];
export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number];

export const WALLET_PAYMENT_METHODS = [
  "fazl_wallet",
  "cash",
] as const satisfies readonly $Enums.WalletPaymentMethod[];
export type WalletPaymentMethod = (typeof WALLET_PAYMENT_METHODS)[number];

export const WALLET_TRANSACTION_STATUSES = [
  "pending",
  "completed",
  "failed",
  "reversed",
] as const satisfies readonly $Enums.WalletTransactionStatus[];
export type WalletTransactionStatus = (typeof WALLET_TRANSACTION_STATUSES)[number];

export const WALLET_TRANSACTION_REFUND_STATUSES = [
  "none",
  "partial",
  "full",
] as const satisfies readonly $Enums.WalletTransactionRefundStatus[];
export type WalletTransactionRefundStatus = (typeof WALLET_TRANSACTION_REFUND_STATUSES)[number];

/** Audit snapshots of who paid whom — denormalised (type, id) pairs, not FKs. */
export const WALLET_REF_MODELS = [
  "User",
  "Wallet",
] as const satisfies readonly $Enums.WalletRefModel[];
export type WalletRefModel = (typeof WALLET_REF_MODELS)[number];

export const WITHDRAWAL_STATUSES = [
  "pending",
  "approved",
  "processing",
  "completed",
  "rejected",
  "cancelled",
] as const satisfies readonly $Enums.WithdrawalStatus[];
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const WITHDRAWAL_METHODS = [
  "bank_transfer",
  "jazzcash",
  "easypaisa",
  "other",
] as const satisfies readonly $Enums.WithdrawalMethod[];
export type WithdrawalMethod = (typeof WITHDRAWAL_METHODS)[number];

export const REFUND_STATUSES = [
  "pending",
  "completed",
  "rejected",
] as const satisfies readonly $Enums.RefundStatus[];
export type RefundStatus = (typeof REFUND_STATUSES)[number];

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
] as const satisfies readonly $Enums.WalletAuditAction[];
export type WalletAuditAction = (typeof WALLET_AUDIT_ACTIONS)[number];

export const WALLET_AUDIT_TARGET_TYPES = [
  "Wallet",
  "WalletTransaction",
  "Withdrawal",
  "Refund",
  "MerchantDeal",
  "WalletSettings",
] as const satisfies readonly $Enums.WalletAuditTargetType[];
export type WalletAuditTargetType = (typeof WALLET_AUDIT_TARGET_TYPES)[number];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fixed primary key of the singleton wallet-settings row. */
export const WALLET_SETTINGS_ID = "wallet-settings";

/** Fallbacks served when the singleton row has never been written. These must
 *  stay identical to the `@default(...)` values on WalletSettings in
 *  schema.prisma, or a freshly-created row would disagree with what `get()`
 *  reported a moment earlier. */
export const WALLET_SETTINGS_DEFAULTS = {
  minTopUpAmountMinor: 10000,
  maxTopUpAmountMinor: 100000000,
  minWithdrawalAmountMinor: 50000,
  maxWithdrawalAmountMinor: 100000000,
  dailyTransactionLimitMinor: 500000000,
  walletStatus: true,
  withdrawalStatus: true,
} as const;

/** Fazl takes no cut of a withdrawal — `externalFeeAmountMinor` records only
 *  what the bank or provider charged, and is never subtracted from the payout. */
export const WITHDRAWAL_PLATFORM_FEE_PERCENT = 0;

// ---------------------------------------------------------------------------
// Swagger response models
// ---------------------------------------------------------------------------

export class WalletOwnerModel {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  userCode?: string | null;
}

export class WalletModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "WLT-000001" })
  walletCode?: string | null;

  @ApiProperty({ description: "Owner id, or the populated owner." })
  ownerId: string;

  @ApiProperty({ enum: WALLET_TYPES })
  walletType: WalletType;

  @ApiProperty({ description: "Spendable balance, in minor units (paisa)." })
  availableBalanceMinor: number;

  @ApiProperty({ description: "Held balance not yet spendable, in minor units." })
  pendingBalanceMinor: number;

  @ApiProperty({ description: "Merchant-only lifetime total received, in minor units." })
  totalReceivedMinor: number;

  @ApiProperty({ description: "Merchant-only lifetime total withdrawn, in minor units." })
  totalWithdrawnMinor: number;

  @ApiProperty({ default: false })
  isFrozen: boolean;

  @ApiPropertyOptional()
  frozenReason?: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  frozenAt?: Date | null;

  @ApiPropertyOptional()
  frozenById?: string | null;

  @ApiProperty({ default: "PKR" })
  currency: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class WalletLedgerEntryModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "LED-000001" })
  ledgerCode?: string | null;

  @ApiProperty()
  walletId: string;

  @ApiProperty({ enum: LEDGER_DIRECTIONS })
  direction: LedgerDirection;

  @ApiProperty({ enum: LEDGER_BALANCE_TYPES })
  balanceType: LedgerBalanceType;

  @ApiProperty({ description: "Always positive; `direction` carries the sign." })
  amountMinor: number;

  @ApiProperty({ description: "Balance before this entry, from the same atomic write." })
  openingBalanceMinor: number;

  @ApiProperty({ description: "Balance after this entry, from the same atomic write." })
  closingBalanceMinor: number;

  @ApiPropertyOptional()
  relatedTransactionId?: string | null;

  @ApiProperty({ enum: LEDGER_RELATED_ENTITY_TYPES })
  relatedEntityType: LedgerRelatedEntityType;

  @ApiPropertyOptional()
  relatedEntityId?: string | null;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}

export class WalletTransactionModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "TXN-000001" })
  transactionCode?: string | null;

  @ApiProperty({ enum: WALLET_TRANSACTION_TYPES })
  type: WalletTransactionType;

  @ApiProperty({ description: "Customer id, or the populated customer." })
  userId: unknown;

  @ApiPropertyOptional({ description: "Merchant id, or the populated merchant." })
  merchantId?: unknown;

  @ApiPropertyOptional()
  orderId?: string | null;

  @ApiProperty()
  originalAmountMinor: number;

  @ApiProperty()
  customerDiscountPercent: number;

  @ApiProperty()
  customerDiscountAmountMinor: number;

  @ApiProperty()
  finalCustomerPaymentMinor: number;

  @ApiProperty()
  merchantDealPercent: number;

  @ApiProperty()
  fazlMarginPercent: number;

  @ApiProperty()
  fazlMarginAmountMinor: number;

  @ApiProperty()
  merchantSettlementAmountMinor: number;

  @ApiPropertyOptional()
  dealSnapshotId?: string | null;

  @ApiProperty({ enum: WALLET_PAYMENT_METHODS })
  paymentMethod: WalletPaymentMethod;

  @ApiPropertyOptional({ enum: WALLET_REF_MODELS })
  senderRefType?: WalletRefModel | null;

  @ApiPropertyOptional()
  senderRefId?: unknown;

  @ApiPropertyOptional({ enum: WALLET_REF_MODELS })
  receiverRefType?: WalletRefModel | null;

  @ApiPropertyOptional()
  receiverRefId?: unknown;

  @ApiProperty({ enum: WALLET_TRANSACTION_STATUSES })
  status: WalletTransactionStatus;

  @ApiProperty({ enum: WALLET_TRANSACTION_REFUND_STATUSES })
  refundStatus: WalletTransactionRefundStatus;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiPropertyOptional({
    description:
      "Ledger entries produced by this transaction. Replaces the old `ledgerEntryIds` array — the link now lives on WalletLedgerEntry.relatedTransactionId only.",
  })
  ledgerEntries?: unknown[];

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class WithdrawalAccountDetailsModel {
  @ApiProperty({ example: "Ali Raza" })
  accountTitle: string;

  @ApiProperty({ example: "01234567890123" })
  accountNumber: string;

  @ApiPropertyOptional({ example: "HBL" })
  bankName?: string | null;

  @ApiPropertyOptional({ example: "PK00HABB0000000000000000" })
  iban?: string | null;
}

export class WithdrawalModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "WDR-000001" })
  withdrawalCode?: string | null;

  @ApiProperty({ description: "Merchant id, or the populated merchant." })
  merchantId: unknown;

  @ApiProperty()
  walletId: string;

  @ApiProperty()
  requestedAmountMinor: number;

  @ApiProperty({ description: "Available balance at the moment the request was raised." })
  availableBalanceSnapshotMinor: number;

  @ApiProperty({ enum: WITHDRAWAL_METHODS })
  withdrawalMethod: WithdrawalMethod;

  @ApiProperty({
    type: WithdrawalAccountDetailsModel,
    description: "Flattened to columns in Postgres, re-nested here for existing clients.",
  })
  accountDetails: WithdrawalAccountDetailsModel;

  @ApiProperty({ enum: WITHDRAWAL_STATUSES })
  status: WithdrawalStatus;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  processingDate?: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  completedDate?: Date | null;

  @ApiPropertyOptional()
  transactionId?: unknown;

  @ApiProperty({ default: WITHDRAWAL_PLATFORM_FEE_PERCENT })
  platformFeePercent: number;

  @ApiPropertyOptional({ description: "What the bank or provider charged. Informational only." })
  externalFeeAmountMinor?: number | null;

  @ApiPropertyOptional()
  externalFeeNote?: string | null;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiPropertyOptional()
  cancellationReason?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class RefundModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "RFD-000001" })
  refundCode?: string | null;

  @ApiProperty({ description: "Transaction id, or the populated transaction." })
  originalTransactionId: unknown;

  @ApiPropertyOptional()
  orderId?: string | null;

  @ApiProperty({ description: "Customer id, or the populated customer." })
  customerId: unknown;

  @ApiPropertyOptional({ description: "Merchant id, or the populated merchant." })
  merchantId?: unknown;

  @ApiProperty()
  refundAmountMinor: number;

  @ApiProperty()
  refundReason: string;

  @ApiProperty({ enum: REFUND_STATUSES })
  refundStatus: RefundStatus;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class MerchantDealModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty()
  merchantId: string;

  @ApiProperty({ description: "Discount handed to the customer, in whole percent." })
  customerDiscountPercent: number;

  @ApiProperty({ description: "Fazl's own margin, in whole percent." })
  fazlMarginPercent: number;

  @ApiProperty({
    description: "Always server-computed as customerDiscountPercent + fazlMarginPercent.",
  })
  merchantDealPercent: number;

  @ApiProperty({ type: String, format: "date-time" })
  effectiveFrom: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    description: "Null on the one active row; set when the deal is superseded.",
  })
  effectiveTo?: Date | null;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class WalletSettingsModel {
  @ApiProperty({ default: WALLET_SETTINGS_DEFAULTS.minTopUpAmountMinor })
  minTopUpAmountMinor: number;

  @ApiProperty({ default: WALLET_SETTINGS_DEFAULTS.maxTopUpAmountMinor })
  maxTopUpAmountMinor: number;

  @ApiProperty({ default: WALLET_SETTINGS_DEFAULTS.minWithdrawalAmountMinor })
  minWithdrawalAmountMinor: number;

  @ApiProperty({ default: WALLET_SETTINGS_DEFAULTS.maxWithdrawalAmountMinor })
  maxWithdrawalAmountMinor: number;

  @ApiProperty({ default: WALLET_SETTINGS_DEFAULTS.dailyTransactionLimitMinor })
  dailyTransactionLimitMinor: number;

  @ApiProperty({ default: true, description: "Master switch for the whole wallet module." })
  walletStatus: boolean;

  @ApiProperty({ default: true })
  withdrawalStatus: boolean;

  @ApiPropertyOptional()
  updatedBy?: string | null;
}

export class WalletAuditLogModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "WAL-000001" })
  logCode?: string | null;

  @ApiProperty({ description: "Admin id, or the populated admin." })
  adminId: unknown;

  @ApiProperty({ enum: WALLET_AUDIT_ACTIONS })
  action: WalletAuditAction;

  @ApiProperty({ enum: WALLET_AUDIT_TARGET_TYPES })
  targetType: WalletAuditTargetType;

  @ApiProperty({
    description:
      "Plain string, never a foreign key — WalletSettings targets the fixed singleton id.",
  })
  targetId: string;

  @ApiPropertyOptional()
  subjectUserId?: unknown;

  @ApiPropertyOptional()
  transactionId?: string | null;

  @ApiPropertyOptional({ description: "Arbitrary before-snapshot." })
  oldValue?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: "Arbitrary after-snapshot." })
  newValue?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiPropertyOptional()
  ipAddress?: string | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}
