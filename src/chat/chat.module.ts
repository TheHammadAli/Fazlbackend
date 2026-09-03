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

  /** The conversation-uniqueness index used to be {buyer, seller} only, from before
   *  product-scoped (offer) conversations existed alongside the general one. Mongoose's
   *  autoIndex only ever adds missing indexes — it never drops ones removed from the
   *  schema — so a database created under the old schema still enforces uniqueness on
   *  {buyer, seller} alone and rejects a second, product-scoped conversation between the
   *  same two users with a raw duplicate-key error. Sync once on boot so the stale index
   *  is dropped and rebuilt to match the current {buyer, seller, product} schema. */
  async onModuleInit() {
    await this.conversationModel.syncIndexes();
  }
}
