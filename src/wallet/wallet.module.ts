import { Module } from "@nestjs/common";

import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletAuditLogService } from "./wallet-audit-log.service";
import { WalletService } from "./wallet.service";
import { WalletTransactionService } from "./wallet-transaction.service";
import { MerchantDealService } from "./merchant-deal.service";
import { WithdrawalService } from "./withdrawal.service";
import { RefundService } from "./refund.service";
import { WalletSettingsService } from "./wallet-settings.service";

import { WalletDashboardController } from "./controllers/wallet-dashboard.controller";
import { WalletUserController } from "./controllers/wallet-user.controller";
import { WalletMerchantController } from "./controllers/wallet-merchant.controller";
import { MerchantDealController } from "./controllers/merchant-deal.controller";
import { WalletTransactionController } from "./controllers/wallet-transaction.controller";
import { WithdrawalController } from "./controllers/withdrawal.controller";
import { RefundController } from "./controllers/refund.controller";
import { WalletAuditLogController } from "./controllers/wallet-audit-log.controller";
import { WalletSettingsController } from "./controllers/wallet-settings.controller";

// PrismaModule is @Global, so PrismaService needs no import here — this replaces the
// eight wallet model registrations plus Counter and User.
@Module({
  controllers: [
    WalletDashboardController,
    WalletUserController,
    WalletMerchantController,
    MerchantDealController,
    WalletTransactionController,
    WithdrawalController,
    RefundController,
    WalletAuditLogController,
    WalletSettingsController,
  ],
  providers: [
    WalletLedgerService,
    WalletAuditLogService,
    WalletService,
    WalletTransactionService,
    MerchantDealService,
    WithdrawalService,
    RefundService,
    WalletSettingsService,
  ],
  exports: [WalletLedgerService, WalletAuditLogService, WalletTransactionService],
})
export class WalletModule {}
