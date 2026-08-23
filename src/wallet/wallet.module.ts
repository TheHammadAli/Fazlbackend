import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { User, UserSchema } from "src/users/schema/users.schema";

import { Wallet, WalletSchema } from "./schema/wallet.schema";
import { WalletLedgerEntry, WalletLedgerEntrySchema } from "./schema/wallet-ledger-entry.schema";
import { WalletTransaction, WalletTransactionSchema } from "./schema/wallet-transaction.schema";
import { MerchantDeal, MerchantDealSchema } from "./schema/merchant-deal.schema";
import { Withdrawal, WithdrawalSchema } from "./schema/withdrawal.schema";
import { Refund, RefundSchema } from "./schema/refund.schema";
import { WalletAuditLog, WalletAuditLogSchema } from "./schema/wallet-audit-log.schema";
import { WalletSettings, WalletSettingsSchema } from "./schema/wallet-settings.schema";

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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletLedgerEntry.name, schema: WalletLedgerEntrySchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: MerchantDeal.name, schema: MerchantDealSchema },
      { name: Withdrawal.name, schema: WithdrawalSchema },
      { name: Refund.name, schema: RefundSchema },
      { name: WalletAuditLog.name, schema: WalletAuditLogSchema },
      { name: WalletSettings.name, schema: WalletSettingsSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
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
