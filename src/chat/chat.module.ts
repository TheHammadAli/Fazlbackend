import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schema/message.schema';
import { Conversation, ConversationSchema } from './schema/conversation.schema';
import { ChatGateway } from './chat.gateway';
import { UsersModule } from 'src/users/users.module';
import { ShopModule } from 'src/shop/shop.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    UsersModule,
    ShopModule,
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
})
export class ChatModule {}
