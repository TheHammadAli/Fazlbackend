import { Module } from "@nestjs/common";

import { ProductOfferController } from "./product-offer.controller";
import { ProductOfferService } from "./product-offer.service";
import { NotificationsModule } from "src/notifications/notifications.module";
import { ProductsModule } from "./products.module";
import { ChatModule } from "src/chat/chat.module";

/**
 * PrismaModule is @Global, so PrismaService needs no import here — this
 * replaces the Product + ProductOffer model registrations.
 *
 * The module's OnModuleInit is gone with them, and it is genuinely obsolete
 * rather than dropped: it called syncIndexes() because the {product, offerer}
 * index used to be unique (buyers could offer only once per listing) and
 * Mongoose's autoIndex only ever ADDS missing indexes, never drops removed
 * ones — so a database created under the old schema kept enforcing uniqueness
 * and rejected a buyer's second offer with a raw duplicate-key error. Prisma
 * migrations are declarative: the index is exactly what schema.prisma declares,
 * non-unique, with nothing to reconcile at boot.
 */
@Module({
  imports: [NotificationsModule, ProductsModule, ChatModule],
  controllers: [ProductOfferController],
  providers: [ProductOfferService],
})
export class ProductOfferModule {}
