import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Product as ProductRow,
  ProductOffer as ProductOfferRow,
  ProductView as ProductViewRow,
  ProductContactClick as ProductContactClickRow,
  ProductWhatsappClick as ProductWhatsappClickRow,
  Prisma,
} from "../../../generated/prisma/client";

/**
 * Module model file — replaces schema/product.schema.ts, product-offer.schema.ts
 * and the three engagement schemas (product-view, product-contact-click,
 * product-whatsapp-click).
 */

export type Product = ProductRow;

/**
 * The shape ProductsService actually returns.
 *
 * The stored row has latitude/longitude columns and plain relation ids; the API
 * has always exposed a GeoJSON `location` and `shopId`/`ownerId`/`category` that
 * may be either an id or a populated object. Naming that difference keeps the
 * controllers honest instead of casting it away.
 */
export type ProductApi = Omit<ProductRow, "latitude" | "longitude"> & {
  _id: string;
  location: { type: "Point"; coordinates: [number, number] } | null;
  shopId?: unknown;
  ownerId?: unknown;
  category?: unknown;
  taggedProductId?: unknown;
  distance?: number;
};
export type ProductOffer = ProductOfferRow;
export type ProductView = ProductViewRow;
export type ProductContactClick = ProductContactClickRow;
export type ProductWhatsappClick = ProductWhatsappClickRow;

export const PRODUCT_TYPES = ["retail", "classified"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_OFFER_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
] as const;
export type ProductOfferStatus = (typeof PRODUCT_OFFER_STATUSES)[number];

/** One parameter on a listing, e.g. { name: "Color", variants: ["Red","Blue"] }. */
export interface ProductParameter {
  name: string;
  variants: string[];
}

/**
 * Flattens `parameters` into the searchable tag list.
 *
 * This was two Mongoose pre-hooks (`save` and `findOneAndUpdate`) that rebuilt
 * `searchableTags` on every write. Prisma has no middleware that fires on every
 * write path, so the computation is called explicitly from create() and
 * update() instead — which also means it now runs on writes the hooks missed,
 * such as updateMany.
 */
export function buildSearchableTags(parameters?: unknown): string[] {
  if (!Array.isArray(parameters)) return [];

  return [
    ...new Set(
      (parameters as ProductParameter[]).flatMap((param) => [
        param?.name,
        ...(Array.isArray(param?.variants) ? param.variants : []),
      ]),
    ),
  ].filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
}

/** The relations a product is read with, matching the old populate() calls. */
export const PRODUCT_INCLUDE = {
  category: true,
  shop: {
    include: {
      owner: { select: { id: true, name: true, phone: true } },
      // type + groupedCategoryIds so an edit form can tell a shop-type
      // category (grouping several product categories) from a shop still
      // filed directly under a plain product category, and knows which
      // product categories that group allows.
      category: { select: { id: true, name: true, type: true, groupedCategoryIds: true } },
    },
  },
  owner: { select: { id: true, name: true, email: true, image: true, phone: true } },
  // Only ever set on a video post — the real listing it optionally promotes.
  // Minimal fields: enough for a card/thumbnail, not a second full product.
  taggedProduct: { select: { id: true, title: true, images: true, price: true } },
} satisfies Prisma.ProductInclude;

export class ProductModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "LST-000052" })
  listingCode?: string | null;

  @ApiPropertyOptional({
    example: "VID-000001",
    description: "Assigned only when the listing carries a video (i.e. appears in the feed).",
  })
  videoCode?: string | null;

  @ApiPropertyOptional({ description: "Shop id, or the populated shop." })
  shopId?: unknown;

  @ApiPropertyOptional({ description: "Owner id, or the populated owner." })
  ownerId?: unknown;

  @ApiProperty({ example: "Leather Sofa" })
  title: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ example: 15000, description: "Price in PKR." })
  price: number;

  @ApiProperty({ description: "Category id, or the populated category." })
  category: unknown;

  @ApiPropertyOptional({
    description: "Only ever set on a video post: the real listing it optionally promotes, id or populated.",
  })
  taggedProductId?: unknown;

  @ApiProperty({ enum: PRODUCT_TYPES })
  type: ProductType;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiPropertyOptional()
  video?: string | null;

  @ApiPropertyOptional({
    description: "GeoJSON Point. Stored as latitude/longitude and converted on read.",
    example: { type: "Point", coordinates: [67.0011, 24.8607] },
  })
  location?: { type: "Point"; coordinates: [number, number] } | null;

  @ApiPropertyOptional({ type: [Object], example: [{ name: "Color", variants: ["Red"] }] })
  parameters?: ProductParameter[];

  @ApiProperty({ type: [String], description: "Derived from `parameters` for search." })
  searchableTags: string[];

  @ApiProperty({ default: false })
  isDeleted: boolean;

  @ApiProperty({ default: false })
  isDisabled: boolean;

  @ApiProperty({
    default: false,
    description: 'True for a lightweight "just a video" shop post (no real category/price).',
  })
  isVideoPost: boolean;

  @ApiPropertyOptional({ example: "123 Main St, Karachi" })
  address?: string | null;

  @ApiPropertyOptional({ description: "Metres from the search point, on geo queries only." })
  distance?: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class ProductOfferModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiProperty()
  product: unknown;

  @ApiProperty()
  offerer: unknown;

  @ApiProperty()
  seller: unknown;

  @ApiPropertyOptional({ type: Number, nullable: true })
  price?: number | null;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: PRODUCT_OFFER_STATUSES, default: "pending" })
  status: ProductOfferStatus;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  respondedAt?: Date | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}
