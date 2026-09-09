import { Test, TestingModule } from "@nestjs/testing";
import { ClsService } from "nestjs-cls";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "src/common/email-service/email-service";
import { AdminsService } from "./admins.service";

/**
 * These cases moved here with `assertMemberIds` when staff were split out of
 * the `users` table: a member is now a row in `members`, so the guard queries
 * that table rather than filtering users by a "moderator" role.
 */
describe("AdminsService", () => {
  let service: AdminsService;
  let prisma: { member: { findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { member: { findMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminsService,
        { provide: PrismaService, useValue: prisma },
        { provide: I18nService, useValue: { translate: (k: string) => k } },
        { provide: ClsService, useValue: { get: () => "en" } },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminsService>(AdminsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("rejects a malformed member id before querying", async () => {
    // Was Types.ObjectId.isValid; isObjectIdLike preserves the same guard.
    await expect(service.assertMemberIds(["not-an-id"])).rejects.toMatchObject({
      status: 400,
    });
    expect(prisma.member.findMany).not.toHaveBeenCalled();
  });

  it("rejects ids that are not member accounts", async () => {
    // Two ids requested, one row back -> at least one is not a member.
    prisma.member.findMany.mockResolvedValue([{ id: "6a8d9c1828b1818429e64faa" }]);
    await expect(
      service.assertMemberIds([
        "6a8d9c1828b1818429e64faa",
        "6a8d9c1828b1818429e64fbb",
      ]),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns the ids when every account is a member", async () => {
    prisma.member.findMany.mockResolvedValue([
      { id: "6a8d9c1828b1818429e64faa" },
      { id: "6a8d9c1828b1818429e64fbb" },
    ]);
    await expect(
      service.assertMemberIds([
        "6a8d9c1828b1818429e64faa",
        "6a8d9c1828b1818429e64fbb",
      ]),
    ).resolves.toEqual([
      "6a8d9c1828b1818429e64faa",
      "6a8d9c1828b1818429e64fbb",
    ]);
  });

  it("de-duplicates ids before validating them", async () => {
    prisma.member.findMany.mockResolvedValue([{ id: "6a8d9c1828b1818429e64faa" }]);
    await expect(
      service.assertMemberIds([
        "6a8d9c1828b1818429e64faa",
        "6a8d9c1828b1818429e64faa",
      ]),
    ).resolves.toEqual(["6a8d9c1828b1818429e64faa"]);
  });
});
