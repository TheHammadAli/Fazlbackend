import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Shop as ShopRow,
  ShopView as ShopViewRow,
  ShopProductView as ShopProductViewRow,
  ShopContactClick as ShopContactClickRow,
  ShopWhatsappClick as ShopWhatsappClickRow,
  Prisma,
} from "../../../generated/prisma/client";

/**
 * Module model file — replaces schema/shop.schema.ts plus the four engagement
 * schemas (shop-view, shop-product-view, shop-contact-click, shop-whatsapp-click).
 */

export type Shop = ShopRow;
export type ShopView = ShopViewRow;
export type ShopProductView = ShopProductViewRow;
export type ShopContactClick = ShopContactClickRow;
export type ShopWhatsappClick = ShopWhatsappClickRow;

/** The relations a shop is read with, matching the old populate() calls. */
export const SHOP_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  subcategory: { select: { id: true, name: true } },
} satisfies Prisma.ShopInclude;

export class ShopModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "SHP-000083" })
  shopCode?: string | null;

  @ApiProperty({ description: "Owner id, or the populated owner." })
  ownerId: unknown;

  @ApiProperty({ example: "Singapore Electronics" })
  title: string;

  @ApiPropertyOptional()
  image?: string | null;

  @ApiPropertyOptional()
  banner?: string | null;

  @ApiProperty()
  address: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ description: "Shop category (required)." })
  category: unknown;

  @ApiPropertyOptional({ description: "Shop subcategory (optional)." })
  subcategory?: unknown;

  @ApiPropertyOptional({ example: "Singapore Plaza" })
  marketName?: string | null;

  @ApiProperty()
  area: string;

  @ApiProperty({ example: "Karachi" })
  city: string;

  @ApiProperty()
  contact: string;

  @ApiPropertyOptional({ example: "Mon-Sat 10:00 AM - 9:00 PM" })
  openingHours?: string | null;

  @ApiProperty({ default: false })
  isDisabled: boolean;

  @ApiPropertyOptional({
    description: "GeoJSON Point. Stored as latitude/longitude and converted on read.",
    example: { type: "Point", coordinates: [67.0011, 24.8607] },
  })
  location?: { type: "Point"; coordinates: [number, number] } | null;

  @ApiPropertyOptional({ description: "Metres from the search point, on geo queries only." })
  distance?: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

/** The analytics block returned alongside a single shop. */
export class ShopStatsModel {
  @ApiProperty()
  productsCount: number;

  @ApiProperty()
  ordersCount: number;

  @ApiProperty({ description: "Distinct users who opened the shop page." })
  totalViews: number;

  @ApiProperty({ description: "Distinct users who opened at least one of its products." })
  uniqueVisitorsCount: number;

  @ApiProperty()
  contactClicks: number;

  @ApiProperty()
  whatsappClicks: number;
}
