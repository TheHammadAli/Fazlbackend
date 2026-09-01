import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BroadcastOfferController } from "./broadcast-offer.controller";
import { BroadcastOfferService } from "./broadcast-offer.service";
import { Broadcast, BroadcastSchema } from "./schema/broadcast.schema";
import { BroadcastThread, BroadcastThreadSchema } from "./schema/broadcast-thread.schema";
import { BroadcastOffer, BroadcastOfferSchema } from "./schema/broadcast-offer.schema";
import { NotificationsModule } from "src/notifications/notifications.module";
import { BroadcastModule } from "./broadcast.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Broadcast.name, schema: BroadcastSchema },
      { name: BroadcastThread.name, schema: BroadcastThreadSchema },
      { name: BroadcastOffer.name, schema: BroadcastOfferSchema },
    ]),
    NotificationsModule,
    BroadcastModule,
  ],
  controllers: [BroadcastOfferController],
  providers: [BroadcastOfferService],
})
export class BroadcastOfferModule {}
