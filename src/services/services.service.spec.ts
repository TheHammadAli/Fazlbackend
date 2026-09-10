import { Test, TestingModule } from "@nestjs/testing";
// ServicesService first: it sits in require cycles with Users/Like/Reviews.
import { ServicesService } from "./services.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { GeoRepository } from "src/prisma/repositories/geo.repository";
import { FeedRepository } from "src/prisma/repositories/feed.repository";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogService } from "src/email-log/email-log.service";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { LikeService } from "src/like/like.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { ReviewService } from "src/reviews/reviews.service";
import { ShareService } from "src/share/share.service";
import { UsersService } from "src/users/users.service";
import { ListingUtilsService } from "src/shared/listing-util-service";
import { bookingStatusFilter, computeBookingStatus } from "./model/service.model";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependencies are
 * PrismaService plus the Geo/Feed repositories instead of six getModelToken
 * providers.
 */
describe("ServicesService", () => {
  let service: ServicesService;
  let prisma: {
    service: { findUnique: jest.Mock };
    serviceView: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      service: { findUnique: jest.fn() },
      serviceView: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeoRepository, useValue: {} },
        { provide: FeedRepository, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: ListingUtilsService, useValue: {} },
        { provide: FileUploadService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
        { provide: LikeService, useValue: {} },
        { provide: ShareService, useValue: {} },
        { provide: ReviewService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: EmailLogService, useValue: {} },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("does not record a view when the owner opens their own service", async () => {
    prisma.service.findUnique.mockResolvedValue({ ownerId: "6a8d9c1828b1818429e64faa" });
    await service.trackView("6a8d9c1828b1818429e64fbb", "6a8d9c1828b1818429e64faa");
    expect(prisma.serviceView.upsert).not.toHaveBeenCalled();
  });

  it("ignores a view with a malformed service id", async () => {
    await service.trackView("nope", "6a8d9c1828b1818429e64faa");
    expect(prisma.service.findUnique).not.toHaveBeenCalled();
  });
});

describe("computeBookingStatus", () => {
  it("puts a completed job ahead of every other signal", () => {
    // The $switch evaluated jobStatus first, so a cancelled-but-completed
    // booking reads as "completed".
    expect(computeBookingStatus("cancelled", "completed")).toBe("completed");
    expect(computeBookingStatus("pending", "completed")).toBe("completed");
  });

  it("maps the remaining branches in order", () => {
    expect(computeBookingStatus("cancelled", "not_started")).toBe("cancelled");
    expect(computeBookingStatus("rejected", "not_started")).toBe("cancelled");
    expect(computeBookingStatus("accepted", "in_progress")).toBe("accepted");
    expect(computeBookingStatus("confirmed", "not_started")).toBe("accepted");
    expect(computeBookingStatus("pending", "not_started")).toBe("pending");
    expect(computeBookingStatus("proposed", "not_started")).toBe("pending");
  });
});

describe("bookingStatusFilter", () => {
  it("excludes completed jobs from every other bucket", () => {
    // Without this the buckets would overlap and the four admin counts would
    // sum to more than the number of bookings.
    for (const bucket of ["cancelled", "accepted", "pending"] as const) {
      expect(bookingStatusFilter(bucket).jobStatus).toEqual({ not: "completed" });
    }
  });

  it("makes the four buckets mutually exclusive", () => {
    // Every (status, jobStatus) pair must fall into exactly one bucket, matching
    // computeBookingStatus.
    const statuses = ["pending", "accepted", "rejected", "proposed", "cancelled", "confirmed"];
    const jobStatuses = ["not_started", "in_progress", "completed"];

    for (const status of statuses) {
      for (const jobStatus of jobStatuses) {
        const bucket = computeBookingStatus(status, jobStatus);
        const filter = bookingStatusFilter(bucket) as any;

        // jobStatus predicate
        if (filter.jobStatus?.not) {
          expect(jobStatus).not.toBe(filter.jobStatus.not);
        } else if (typeof filter.jobStatus === "string") {
          expect(jobStatus).toBe(filter.jobStatus);
        }

        // status predicate
        if (filter.status?.in) expect(filter.status.in).toContain(status);
        if (filter.status?.notIn) expect(filter.status.notIn).not.toContain(status);
      }
    }
  });
});
