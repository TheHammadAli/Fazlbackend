import { Module, OnModuleInit } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { ProductOfferController } from "./product-offer.controller";
import { ProductOfferService } from "./product-offer.service";
import { Product, ProductSchema } from "./schema/product.schema";
import { ProductOffer, ProductOfferSchema } from "./schema/product-offer.schema";
import { NotificationsModule } from "src/notifications/notifications.module";
import { ProductsModule } from "./products.module";
import { ChatModule } from "src/chat/chat.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductOffer.name, schema: ProductOfferSchema },
    ]),
    NotificationsModule,
    ProductsModule,
    ChatModule,
  ],
  controllers: [ProductOfferController],
  providers: [ProductOfferService],
})
export class ProductOfferModule implements OnModuleInit {
  constructor(
    @InjectModel(ProductOffer.name)
    private readonly offerModel: Model<ProductOffer>,
  ) {}

  /** The {product, offerer} index used to be unique (buyers could offer only once per
   *  listing) before repeat offers after a decline were allowed. Mongoose's default
   *  autoIndex only ever adds missing indexes — it never drops ones removed from the
   *  schema — so a database created under the old schema keeps enforcing uniqueness
   *  and rejects a buyer's second offer with a raw duplicate-key error. Sync once on
   *  boot so the stale unique index is dropped and rebuilt to match the current schema. */
  async onModuleInit() {
    await this.offerModel.syncIndexes();
  }
}
