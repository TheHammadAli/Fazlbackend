import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "src/users/users.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { getModelToken } from "@nestjs/mongoose";
import { Otp } from "./schema/otp.schema";
import { EmailService } from "src/common/email-service/email-service";

describe("AuthService", () => {
  let service: AuthService;
  let userService: { findUserByEmail: jest.Mock; createUser: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    userService = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue("signed-token"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: I18nService, useValue: { translate: jest.fn() } },
        { provide: ClsService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: getModelToken(Otp.name), useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns a full user payload for newly created Google users", async () => {
    userService.findUserByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      _id: "user-1",
      email: "google-user@example.com",
      roles: ["buyer"],
      location: { type: "Point", coordinates: [0, 0] },
      image: "avatar.png",
      name: "Google User",
      address: "",
      isDisabled: false,
      toObject: () => ({
        _id: "user-1",
        email: "google-user@example.com",
        roles: ["buyer"],
        location: { type: "Point", coordinates: [0, 0] },
        image: "avatar.png",
        name: "Google User",
        address: "",
        isDisabled: false,
      }),
    });

    const result = await service.findOrCreateUserByEmail({
      sub: "google-sub",
      email: "google-user@example.com",
      name: "Google User",
    });

    expect(result.accessToken).toBe("signed-token");
    expect(result.email).toBe("google-user@example.com");
    expect(result.name).toBe("Google User");
    expect(result.refreshToken).toBeDefined();
  });
});
