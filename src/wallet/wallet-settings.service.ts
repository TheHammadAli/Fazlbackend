import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { WalletSettings, WalletSettingsDocument } from "./schema/wallet-settings.schema";
import { UpdateWalletSettingsDto } from "./dto/update-wallet-settings.dto";
import { WalletAuditLogService } from "./wallet-audit-log.service";

const WALLET_SETTINGS_ID = "wallet-settings";

const DEFAULTS = {
  minTopUpAmountMinor: 10000,
  maxTopUpAmountMinor: 100000000,
  minWithdrawalAmountMinor: 50000,
  maxWithdrawalAmountMinor: 100000000,
  dailyTransactionLimitMinor: 500000000,
  walletStatus: true,
  withdrawalStatus: true,
};

type WalletSettingsResult = typeof DEFAULTS & { updatedBy: string | null };

/** Singleton wallet-wide configuration (spec §11) — mirrors SettingsService's
 *  fixed-`_id` singleton idiom. */
@Injectable()
export class WalletSettingsService {
  constructor(
    @InjectModel(WalletSettings.name)
    private readonly settingsModel: Model<WalletSettingsDocument>,
    private readonly auditLogService: WalletAuditLogService,
  ) {}

  async get(): Promise<WalletSettingsResult> {
    const doc = await this.settingsModel.findById(WALLET_SETTINGS_ID).lean();
    if (!doc) return { ...DEFAULTS, updatedBy: null };
    return {
      minTopUpAmountMinor: doc.minTopUpAmountMinor,
      maxTopUpAmountMinor: doc.maxTopUpAmountMinor,
      minWithdrawalAmountMinor: doc.minWithdrawalAmountMinor,
      maxWithdrawalAmountMinor: doc.maxWithdrawalAmountMinor,
      dailyTransactionLimitMinor: doc.dailyTransactionLimitMinor,
      walletStatus: doc.walletStatus,
      withdrawalStatus: doc.withdrawalStatus,
      updatedBy: doc.updatedBy ? doc.updatedBy.toString() : null,
    };
  }

  // No global ValidationPipe is registered in this app, so class-validator decorators on the
  // DTO are documentation only, not enforcement — cross-field bounds must be checked here.
  private validate(dto: UpdateWalletSettingsDto, current: WalletSettingsResult) {
    const merged = { ...current, ...dto };
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

    const doc = await this.settingsModel
      .findByIdAndUpdate(
        WALLET_SETTINGS_ID,
        { $set: { ...DEFAULTS, ...current, ...dto, updatedBy: new Types.ObjectId(adminId) } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean();

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
      minTopUpAmountMinor: doc!.minTopUpAmountMinor,
      maxTopUpAmountMinor: doc!.maxTopUpAmountMinor,
      minWithdrawalAmountMinor: doc!.minWithdrawalAmountMinor,
      maxWithdrawalAmountMinor: doc!.maxWithdrawalAmountMinor,
      dailyTransactionLimitMinor: doc!.dailyTransactionLimitMinor,
      walletStatus: doc!.walletStatus,
      withdrawalStatus: doc!.withdrawalStatus,
      updatedBy: doc!.updatedBy ? doc!.updatedBy.toString() : null,
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
    if (amountMinor < settings.minWithdrawalAmountMinor || amountMinor > settings.maxWithdrawalAmountMinor) {
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
