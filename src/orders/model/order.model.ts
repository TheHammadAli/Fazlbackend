import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { Order as OrderRow } from "../../../generated/prisma/client";

/** Module model file — replaces schema/order.schema.ts. */

/**
 * The API keeps exposing a single `owner`, as it always has.
 *
 * Storage splits that refPath into two typed foreign keys (shop_owner_id /
 * user_owner_id) with a CHECK constraint asserting exactly one is set and that
 * it agrees with `ownerModel` — something the refPath could never enforce.
 * OrdersService collapses them back on the way out.
 */
export type Order = OrderRow & { owner?: unknown };

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PAYMENT_TYPES = ["cashonDelivery", "Easypaisa"] as const;
export type OrderPaymentType = (typeof ORDER_PAYMENT_TYPES)[number];

export const DELIVERY_OPTIONS = ["self-pickup", "delivery"] as const;
export type DeliveryOption = (typeof DELIVERY_OPTIONS)[number];

export const OWNER_MODELS = ["Shop", "User"] as const;
export type OwnerModel = (typeof OWNER_MODELS)[number];

/** Action labels carried in order notification payloads. */
export const ORDER_ACTIONS = {
  placed: "placed",
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  received: "received",
} as const;

export class OrderModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty({ description: "Buyer id, or the populated buyer." })
  buyer: unknown;

  @ApiProperty({ enum: OWNER_MODELS, description: "Which kind of owner `owner` refers to." })
  ownerModel: OwnerModel;

  @ApiProperty({ description: "Shop or User that owns the listing, populated on reads." })
  owner: unknown;

  @ApiProperty({ description: "Product id, or the populated product." })
  product: unknown;

  @ApiProperty({ enum: DELIVERY_OPTIONS })
  deliveryOption: DeliveryOption;

  @ApiProperty({ enum: ORDER_STATUSES, default: "pending" })
  status: OrderStatus;

  @ApiProperty({ enum: ORDER_PAYMENT_TYPES, default: "cashonDelivery" })
  paymentType: OrderPaymentType;

  @ApiProperty({ example: 1500, description: "Amount in PKR." })
  amount: number;

  @ApiProperty({ example: 1 })
  quantity: number;

  @ApiPropertyOptional({ description: "Purchase-time snapshot of the chosen product options." })
  variant?: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
