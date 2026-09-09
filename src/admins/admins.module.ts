import { Module } from "@nestjs/common";

import { ActivityLogModule } from "src/activity-log/activity-log.module";
import { EmailService } from "src/common/email-service/email-service";

import { AdminsService } from "./admins.service";
import { AdminsController, MembersController } from "./admins.controller";

/**
 * Staff accounts — the `admins` and `members` tables.
 *
 * Deliberately has no dependency on UsersModule: nothing here reads or writes a
 * customer row, which is the whole point of the split.
 *
 * PrismaModule is @Global, so PrismaService needs no import.
 */
@Module({
  imports: [ActivityLogModule],
  controllers: [AdminsController, MembersController],
  providers: [AdminsService, EmailService],
  exports: [AdminsService],
})
export class AdminsModule {}
