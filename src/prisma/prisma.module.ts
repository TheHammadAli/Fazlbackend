import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "./prisma.service";
import { ReportRepository } from "./repositories/report.repository";
import { ReviewRepository } from "./repositories/review.repository";
import { GeoRepository } from "./repositories/geo.repository";
import { ConversationRepository } from "./repositories/conversation.repository";
import { FeedRepository } from "./repositories/feed.repository";
import { BroadcastRepository } from "./repositories/broadcast.repository";

/**
 * ConfigModule.forRoot() in AppModule is not registered as global, so
 * ConfigService is not visible inside this module's context unless imported
 * here explicitly.
 *
 * The repositories live here alongside PrismaService because each one holds raw
 * SQL shared by more than one feature module, and because keeping them global
 * mirrors the reach MongooseModule.forRoot() gave the connection they replace.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    ReportRepository,
    ReviewRepository,
    GeoRepository,
    ConversationRepository,
    FeedRepository,
    BroadcastRepository,
  ],
  exports: [
    PrismaService,
    ReportRepository,
    ReviewRepository,
    GeoRepository,
    ConversationRepository,
    FeedRepository,
    BroadcastRepository,
  ],
})
export class PrismaModule {}
