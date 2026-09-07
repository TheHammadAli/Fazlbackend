import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Service as ServiceRow,
  ServiceRequest as ServiceRequestRow,
  ServiceView as ServiceViewRow,
  ServiceContactClick as ServiceContactClickRow,
  ServiceWhatsappClick as ServiceWhatsappClickRow,
  Prisma,
} from "../../../generated/prisma/client";

/**
 * Module model file — replaces schema/services.schema.ts, service_request.schema.ts
 * and the three engagement schemas (service-view, service-contact-click,
 * service-whatsapp-click).
 */

export type Service = ServiceRow;
export type ServiceRequest = ServiceRequestRow;
export type ServiceView = ServiceViewRow;
export type ServiceContactClick = ServiceContactClickRow;
export type ServiceWhatsappClick = ServiceWhatsappClickRow;

/** The shape ServicesService returns: GeoJSON `location`, populated relations, `_id`. */
export type ServiceApi = Omit<ServiceRow, "latitude" | "longitude"> & {
  _id: string;
  location: { type: "Point"; coordinates: [number, number] } | null;
  ownerId?: unknown;
  category?: unknown;
  distance?: number;
};

export const SERVICE_PAYMENT_TYPES = ["hourly", "fixed", "call_for_price"] as const;
export type ServicePaymentType = (typeof SERVICE_PAYMENT_TYPES)[number];

export const REQUEST_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "proposed",
  "cancelled",
  "confirmed",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/**
 * The Mongoose `enum:` only ever admitted the first three, but the TypeScript
 * JobStatus union also declared "verified" and "disputed". Both are carried
 * here so a value written through a validation-bypassing path is still
 * representable.
 */
export const JOB_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "verified",
  "disputed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** The four buckets the admin Bookings page groups requests into. */
export const BOOKING_STATUSES = ["pending", "accepted", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * `bookingStatus` is derived, not stored — it was an aggregation $switch over
 * (jobStatus, status), evaluated in that order.
 */
export function computeBookingStatus(status?: string, jobStatus?: string): BookingStatus {
  if (jobStatus === "completed") return "completed";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  if (status === "accepted" || status === "confirmed") return "accepted";
  return "pending";
}

/**
 * The same derivation as a database filter.
 *
 * The $switch had ordered branches, so each bucket must also exclude the
 * conditions of the branches above it — otherwise "cancelled" would wrongly
 * include a completed job that was later cancelled.
 */
export function bookingStatusFilter(
  bucket: BookingStatus,
): Prisma.ServiceRequestWhereInput {
  switch (bucket) {
    case "completed":
      return { jobStatus: "completed" };
    case "cancelled":
      return {
        jobStatus: { not: "completed" },
        status: { in: ["cancelled", "rejected"] },
      };
    case "accepted":
      return {
        jobStatus: { not: "completed" },
        status: { in: ["accepted", "confirmed"] },
      };
    case "pending":
    default:
      return {
        jobStatus: { not: "completed" },
        status: { notIn: ["cancelled", "rejected", "accepted", "confirmed"] },
      };
  }
}

/** The relations a service is read with, matching the old populate() calls. */
export const SERVICE_INCLUDE = {
  category: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      address: true,
      phone: true,
      latitude: true,
      longitude: true,
    },
  },
} satisfies Prisma.ServiceInclude;

export class ServiceModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "SVC-000010" })
  serviceCode?: string | null;

  @ApiProperty({ description: "Owner id, or the populated owner." })
  ownerId: unknown;

  @ApiProperty({ example: "AC Repair" })
  title: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional({ example: 2500, description: "Price in PKR." })
  price?: number | null;

  @ApiProperty({ enum: SERVICE_PAYMENT_TYPES, default: "fixed" })
  paymentType: ServicePaymentType;

  @ApiProperty({ default: true })
  requiresAppointment: boolean;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiPropertyOptional()
  video?: string | null;

  @ApiProperty({ description: "Category id, or the populated category." })
  category: unknown;

  @ApiPropertyOptional({
    description: "GeoJSON Point. Stored as latitude/longitude and converted on read.",
    example: { type: "Point", coordinates: [67.0011, 24.8607] },
  })
  location?: { type: "Point"; coordinates: [number, number] } | null;

  @ApiPropertyOptional({ type: [Object] })
  parameters?: unknown;

  @ApiProperty({ default: false })
  isDeleted: boolean;

  @ApiProperty({ default: false })
  isDisabled: boolean;

  @ApiPropertyOptional({ description: "Metres from the search point, on geo queries only." })
  distance?: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt: Date;
}

export class ServiceRequestModel {
  @ApiProperty({ example: "6a8d9c1828b1818429e64faa" })
  id: string;

  @ApiProperty({ description: "Mirror of `id`, kept for existing clients." })
  _id: string;

  @ApiPropertyOptional({ example: "JOB-000010" })
  jobCode?: string | null;

  @ApiProperty()
  service: unknown;

  @ApiProperty()
  customer: unknown;

  @ApiProperty()
  provider: unknown;

  @ApiProperty({ type: String, format: "date-time" })
  requestedDateTime: Date;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  proposedDateTime?: Date | null;

  @ApiProperty({ enum: REQUEST_STATUSES, default: "pending" })
  status: RequestStatus;

  @ApiProperty({ enum: JOB_STATUSES, default: "not_started" })
  jobStatus: JobStatus;

  @ApiPropertyOptional({
    enum: BOOKING_STATUSES,
    description: "Derived from status + jobStatus; not stored.",
  })
  bookingStatus?: BookingStatus;

  @ApiPropertyOptional()
  message?: string | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  startedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: "date-time" })
  completedAt?: Date | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
}
