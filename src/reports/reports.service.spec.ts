import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { ReportsService } from "./reports.service";
import { Report } from "./schema/report.schema";
import { Counter } from "src/common/schema/counter.schema";
import { User } from "src/users/schema/users.schema";
import { EmailService } from "src/common/email-service/email-service";

describe("ReportsService", () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(Report.name), useValue: {} },
        { provide: getModelToken(Counter.name), useValue: {} },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: I18nService, useValue: { translate: jest.fn() } },
        { provide: ClsService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
