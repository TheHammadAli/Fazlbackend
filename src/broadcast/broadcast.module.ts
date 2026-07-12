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
import { ProductsModule } from "src/products/products.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ConfigService } from "@nestjs/config";

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
    ProductsModule,
    NotificationsModule,
  ],
  controllers: [BroadcastController],
  providers: [
    BroadcastService,
    BroadcastGateway,
    FileUploadService,
    ConfigService,
  ],
  exports: [BroadcastService],
})
export class BroadcastModule { }
