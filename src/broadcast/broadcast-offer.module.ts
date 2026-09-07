import { Module } from "@nestjs/common";

import { BroadcastOfferController } from "./broadcast-offer.controller";
import { BroadcastOfferService } from "./broadcast-offer.service";
import { NotificationsModule } from "src/notifications/notifications.module";
import { BroadcastModule } from "./broadcast.module";

// PrismaModule is @Global, so PrismaService needs no import here — this
// replaces the Broadcast + BroadcastThread + BroadcastOffer registrations.
@Module({
  imports: [NotificationsModule, BroadcastModule],
  controllers: [BroadcastOfferController],
  providers: [BroadcastOfferService],
})
export class BroadcastOfferModule {}
