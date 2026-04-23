import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BroadcastController } from "./broadcast.controller";
import { BroadcastService } from "./broadcast.service";
import { BroadcastGateway } from "./broadcast.gateway";
import { ShopModule } from "../shop/shop.module";
import { CategoryModule } from "src/category/category.module";
import { Broadcast, BroadcastSchema } from "./schema/broadcast.schema";

import {
  BroadcastMessage,
  BroadcastMessageSchema,
} from "./schema/broadcast-message.schema";
import { UsersModule } from "src/users/users.module";
import {
  BroadcastThread,
  BroadcastThreadSchema,
} from "./schema/broadcast-thread.schema";
import { ServicesModule } from "src/services/services.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Broadcast.name,
        schema: BroadcastSchema,
      },
      {
        name: BroadcastMessage.name,
        schema: BroadcastMessageSchema,
      },
      { name: BroadcastThread.name, schema: BroadcastThreadSchema },
    ]),
    ShopModule,
    CategoryModule,
    UsersModule,
    ServicesModule,
  ],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastGateway],
  exports: [BroadcastService],
})
export class BroadcastModule {}
