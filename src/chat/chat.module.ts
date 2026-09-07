import { Module, forwardRef } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.gateway";
import { UsersModule } from "src/users/users.module";
import { ShopModule } from "src/shop/shop.module";
import { FileUploadService } from "src/common/file-upload/file-upload.service";
import { ConfigService } from "@nestjs/config";
import { NotificationsModule } from "src/notifications/notifications.module";
import { PresenceModule } from "src/presence/presence.module";

/**
 * PrismaModule is @Global and exports PrismaService plus ConversationRepository,
 * so neither needs importing here — this replaces the Message + Conversation
 * model registrations.
 *
 * The module's OnModuleInit hook is gone with them, and both halves of it are
 * genuinely obsolete rather than dropped:
 *
 *   - `syncIndexes()` existed because Mongoose's autoIndex only ever ADDS
 *     missing indexes and never drops ones removed from the schema, so a stale
 *     index could keep enforcing rules the current schema no longer declared.
 *     Prisma migrations are declarative: an index removed from schema.prisma is
 *     dropped by the migration that removes it, so there is nothing to sync at
 *     boot.
 *
 *   - The `status` backfill existed because Mongoose defaults only apply to
 *     newly-constructed documents, never retroactively — so messages written
 *     before the field existed read back as `undefined` forever. A Postgres
 *     column has a real DEFAULT and is NOT NULL, so no row can be missing it.
 */
@Module({
  imports: [
    forwardRef(() => UsersModule),
    ShopModule,
    NotificationsModule,
    PresenceModule,
  ],
  providers: [ChatService, ChatGateway, FileUploadService, ConfigService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
