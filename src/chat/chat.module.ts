import { Module, OnModuleInit, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Message, MessageSchema } from "./schema/message.schema";
import { Conversation, ConversationSchema } from "./schema/conversation.schema";
import { ChatGateway } from "./chat.gateway";
import { UsersModule } from "src/users/users.module";
import { ShopModule } from "src/shop/shop.module";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ConfigService } from "@nestjs/config";
import { NotificationsModule } from "src/notifications/notifications.module";
import { PresenceModule } from "src/presence/presence.module";
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    forwardRef(() => UsersModule),
    ShopModule,
    NotificationsModule,
    PresenceModule,
  ],
  providers: [ChatService, ChatGateway, FileUploadService, ConfigService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule implements OnModuleInit {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
  ) {}

  /** Mongoose's autoIndex only ever adds missing indexes on boot — it never drops ones
   *  removed from the schema — so any past schema change (e.g. the now-reverted
   *  {buyer, seller, product} index from when offers briefly got their own conversation)
   *  can leave a stale index enforcing rules the current schema no longer declares. Sync
   *  once on boot so the database's indexes always match what's actually in the schema. */
  async onModuleInit() {
    await this.conversationModel.syncIndexes();
  }
}
