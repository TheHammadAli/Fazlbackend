import type { Counter as CounterRow } from "../../../generated/prisma/client";

/**
 * Shared model file — replaces common/schema/counter.schema.ts.
 *
 * Generic atomic-sequence counter behind every human-readable code
 * (userCode, shopCode, listingCode, serviceCode, emailLogId, ...). One row per
 * key, and the key is a plain string rather than an ObjectId.
 */
export type Counter = CounterRow;

/**
 * Every counter key used across the app, gathered in one place so two modules
 * cannot silently reserve sequences from the same key or drift apart on
 * spelling. These strings are primary keys of existing rows — changing one
 * restarts that sequence at zero.
 */
export const COUNTER_KEYS = {
  user: "userCode",
  shop: "shopCode",
  listing: "listingCode",
  video: "videoCode",
  service: "serviceCode",
  job: "jobCode",
  broadcast: "broadcastCode",
  report: "reportCode",
  announcement: "announcementCode",
  emailLog: "emailLogId",
  activityLog: "activityLogCode",
  wallet: "walletCode",
  walletTransaction: "transactionCode",
  walletLedger: "ledgerCode",
  withdrawal: "withdrawalCode",
  refund: "refundCode",
  walletAuditLog: "logCode",
} as const;

export type CounterKey = (typeof COUNTER_KEYS)[keyof typeof COUNTER_KEYS];
