import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "src/users/users.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "src/common/email-service/email-service";
import { ActivityLogService } from "src/activity-log/activity-log.service";
import { AdminsService } from "src/admins/admins.service";

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
        { provide: ActivityLogService, useValue: { record: jest.fn() } },
        // Staff live in their own tables now; the admin-panel login path goes
        // through AdminsService, never UsersService.
        {
          provide: AdminsService,
          useValue: {
            validateStaffForLogin: jest.fn(),
            findStaffById: jest.fn(),
            storeRefreshToken: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns a full user payload for newly created Google users", async () => {
    userService.findUserByEmail.mockResolvedValue(null);
    // createUser returns { message, data } — the wrapper, not the user. The
    // previous version of this test mocked it as returning the user directly,
    // which is what hid a real bug: the service read `_id` off the wrapper, so
    // every Google sign-up for a new account minted a token whose `sub` claim
    // was undefined.
    userService.createUser.mockResolvedValue({
      message: "created",
      data: {
        id: "6a8d9c1828b1818429e64faa",
        _id: "6a8d9c1828b1818429e64faa",
        email: "google-user@example.com",
        roles: ["buyer"],
        location: { type: "Point", coordinates: [0, 0] },
        image: "avatar.png",
        name: "Google User",
        address: "",
        isDisabled: false,
      },
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
    // The claim the whole session depends on.
    expect(result.sub).toBe("6a8d9c1828b1818429e64faa");
  });

  it("never puts a password hash into the signed token for an existing user", async () => {
    userService.findUserByEmail.mockResolvedValue({
      id: "6a8d9c1828b1818429e64fbb",
      email: "existing@example.com",
      name: "Existing User",
      roles: ["buyer"],
      latitude: 24.8607,
      longitude: 67.0011,
      password: "$2a$10$hashed",
      refreshToken: "old-token",
      resetPasswordToken: "reset",
      provider: "google",
    });

    const result = await service.findOrCreateUserByEmail({
      sub: "google-sub",
      email: "existing@example.com",
    });

    // Mongoose's select:false used to keep these out; Prisma returns every
    // scalar, so stripUserSecrets has to.
    expect(result.password).toBeUndefined();
    expect(result.resetPasswordToken).toBeUndefined();
    expect(result.provider).toBeUndefined();
    expect(result.sub).toBe("6a8d9c1828b1818429e64fbb");
    // latitude/longitude are rebuilt into the GeoJSON the token has always had.
    expect(result.location).toEqual({ type: "Point", coordinates: [67.0011, 24.8607] });
  });
});
