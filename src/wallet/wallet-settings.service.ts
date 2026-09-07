import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateWalletSettingsDto } from "./dto/update-wallet-settings.dto";
import { WALLET_SETTINGS_DEFAULTS, WALLET_SETTINGS_ID } from "./model/wallet.model";
import { WalletAuditLogService } from "./wallet-audit-log.service";

export type WalletSettingsResult = {
  minTopUpAmountMinor: number;
  maxTopUpAmountMinor: number;
  minWithdrawalAmountMinor: number;
  maxWithdrawalAmountMinor: number;
  dailyTransactionLimitMinor: number;
  walletStatus: boolean;
  withdrawalStatus: boolean;
  updatedBy: string | null;
};

/** `{ a: 1, b: undefined }` would overwrite a real value with undefined when spread over
 *  the current settings, so explicitly-absent DTO keys are dropped first. */
function definedOnly<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/** Singleton wallet-wide configuration (spec §11) — one row under the fixed primary key
 *  `WALLET_SETTINGS_ID`, mirroring SiteSettings' singleton idiom. */
@Injectable()
export class WalletSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: WalletAuditLogService,
  ) {}

  async get(): Promise<WalletSettingsResult> {
    const row = await this.prisma.walletSettings.findUnique({
      where: { id: WALLET_SETTINGS_ID },
    });
    if (!row) return { ...WALLET_SETTINGS_DEFAULTS, updatedBy: null };
    return {
      minTopUpAmountMinor: row.minTopUpAmountMinor,
      maxTopUpAmountMinor: row.maxTopUpAmountMinor,
      minWithdrawalAmountMinor: row.minWithdrawalAmountMinor,
      maxWithdrawalAmountMinor: row.maxWithdrawalAmountMinor,
      dailyTransactionLimitMinor: row.dailyTransactionLimitMinor,
      walletStatus: row.walletStatus,
      withdrawalStatus: row.withdrawalStatus,
      updatedBy: row.updatedById,
    };
  }

  // No global ValidationPipe is registered in this app, so class-validator decorators on the
  // DTO are documentation only, not enforcement — cross-field bounds must be checked here.
  private validate(dto: UpdateWalletSettingsDto, current: WalletSettingsResult) {
    const merged = { ...current, ...definedOnly(dto) };
    if (merged.minTopUpAmountMinor > merged.maxTopUpAmountMinor) {
      throw new BadRequestException("Minimum top-up cannot exceed maximum top-up");
    }
    if (merged.minWithdrawalAmountMinor > merged.maxWithdrawalAmountMinor) {
      throw new BadRequestException("Minimum withdrawal cannot exceed maximum withdrawal");
    }
  }

  async update(dto: UpdateWalletSettingsDto, adminId: string): Promise<WalletSettingsResult> {
    const current = await this.get();
    this.validate(dto, current);

    const { updatedBy: _ignored, ...currentValues } = current;
    const merged = { ...currentValues, ...definedOnly(dto) };

    const row = await this.prisma.walletSettings.upsert({
      where: { id: WALLET_SETTINGS_ID },
      create: { id: WALLET_SETTINGS_ID, ...merged, updatedById: adminId },
      update: { ...merged, updatedById: adminId },
    });

    await this.auditLogService.record({
      adminId,
      action: "wallet_settings_change",
      targetType: "WalletSettings",
      targetId: WALLET_SETTINGS_ID,
      oldValue: { ...current },
      newValue: { ...dto },
      reason: null,
    });

    return {
      minTopUpAmountMinor: row.minTopUpAmountMinor,
      maxTopUpAmountMinor: row.maxTopUpAmountMinor,
      minWithdrawalAmountMinor: row.minWithdrawalAmountMinor,
      maxWithdrawalAmountMinor: row.maxWithdrawalAmountMinor,
      dailyTransactionLimitMinor: row.dailyTransactionLimitMinor,
      walletStatus: row.walletStatus,
      withdrawalStatus: row.withdrawalStatus,
      updatedBy: row.updatedById,
    };
  }

  /** Enforcement helpers — called by WalletService/WithdrawalService/WalletLedgerService so
   *  these settings actually govern behavior rather than just being stored (spec §11). */

  async assertWalletEnabled(): Promise<void> {
    const settings = await this.get();
    if (!settings.walletStatus) {
      throw new BadRequestException("The wallet module is currently disabled in Wallet Settings");
    }
  }

  async assertWithdrawalEnabled(): Promise<void> {
    const settings = await this.get();
    if (!settings.withdrawalStatus) {
      throw new BadRequestException("Withdrawals are currently disabled in Wallet Settings");
    }
  }

  async assertTopUpAmountWithinLimits(amountMinor: number): Promise<void> {
    const settings = await this.get();
    if (amountMinor < settings.minTopUpAmountMinor || amountMinor > settings.maxTopUpAmountMinor) {
      throw new BadRequestException(
        `Amount must be between ${settings.minTopUpAmountMinor} and ${settings.maxTopUpAmountMinor} minor units`,
      );
    }
  }

  async assertWithdrawalAmountWithinLimits(amountMinor: number): Promise<void> {
    const settings = await this.get();
    if (
      amountMinor < settings.minWithdrawalAmountMinor ||
      amountMinor > settings.maxWithdrawalAmountMinor
    ) {
      throw new BadRequestException(
        `Withdrawal amount must be between ${settings.minWithdrawalAmountMinor} and ${settings.maxWithdrawalAmountMinor} minor units`,
      );
    }
  }

  async getDailyTransactionLimitMinor(): Promise<number> {
    const settings = await this.get();
    return settings.dailyTransactionLimitMinor;
  }
}
