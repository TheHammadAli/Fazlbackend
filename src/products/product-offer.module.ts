import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ProductOfferController } from "./product-offer.controller";
import { ProductOfferService } from "./product-offer.service";
import { Product, ProductSchema } from "./schema/product.schema";
import { ProductOffer, ProductOfferSchema } from "./schema/product-offer.schema";
import { NotificationsModule } from "src/notifications/notifications.module";
import { ProductsModule } from "./products.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductOffer.name, schema: ProductOfferSchema },
    ]),
    NotificationsModule,
    ProductsModule,
  ],
  controllers: [ProductOfferController],
  providers: [ProductOfferService],
})
export class ProductOfferModule {}
