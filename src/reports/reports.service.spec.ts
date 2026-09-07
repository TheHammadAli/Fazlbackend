import { Test, TestingModule } from "@nestjs/testing";
import { ReportsService } from "./reports.service";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { ReportRepository } from "src/prisma/repositories/report.repository";
import { EmailService } from "src/common/email-service/email-service";
import { NotificationsService } from "src/notifications/notifications.service";

/**
 * Now backed by Prisma rather than Mongoose, so the injected dependencies are
 * PrismaService and ReportRepository instead of three getModelToken providers
 * (Report, Counter, User).
 */
describe("ReportsService", () => {
  let service: ReportsService;
  let prisma: {
    report: { findUnique: jest.Mock; update: jest.Mock };
    shop: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let repository: { findForAdmin: jest.Mock };

  beforeEach(async () => {
    prisma = {
      report: { findUnique: jest.fn(), update: jest.fn() },
      shop: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    repository = { findForAdmin: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReportRepository, useValue: repository },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: NotificationsService, useValue: {} },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("treats a malformed report id as not found, without querying", async () => {
    await expect(service.closeReport("nope", "admin1")).rejects.toMatchObject({
      status: 404,
    });
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
  });

  it("refuses to close a report that is already closed", async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: "6a8d9c1828b1818429e64faa",
      status: "closed",
    });
    await expect(
      service.closeReport("6a8d9c1828b1818429e64faa", "admin1"),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns the reason in wire form, not the Prisma identifier", async () => {
    // The DB stores "Adult Content"; the Prisma client speaks AdultContent.
    // Clients have always seen the spaced value and must keep seeing it.
    prisma.report.findUnique.mockResolvedValue({
      id: "6a8d9c1828b1818429e64faa",
      status: "open",
    });
    prisma.report.update.mockResolvedValue({
      id: "6a8d9c1828b1818429e64faa",
      reason: "AdultContent",
      status: "closed",
    });

    const result = await service.closeReport("6a8d9c1828b1818429e64faa", "admin1");
    expect((result.data.report as any).reason).toBe("Adult Content");
  });

  it("passes the admin list straight through from the repository", async () => {
    repository.findForAdmin.mockResolvedValue({ rows: [{ id: "r1" }], total: 1 });

    const result = await service.getAllReportsForAdmin(2, 20, "product", "open");

    expect(result.meta).toEqual({ total: 1, page: 2, limit: 20, totalPages: 1 });
    expect(repository.findForAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20, entityType: "product", status: "open" }),
    );
  });
});
