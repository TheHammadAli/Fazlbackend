import { forwardRef, Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "./schema/product.schema";
import { ProductView, ProductViewSchema } from "./schema/product-view.schema";
import { ProductContactClick, ProductContactClickSchema } from "./schema/product-contact-click.schema";
import { ProductWhatsappClick, ProductWhatsappClickSchema } from "./schema/product-whatsapp-click.schema";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { ShopModule } from "src/shop/shop.module";
import { SharedModule } from "src/shared/shared.module";
import { UsersModule } from "src/users/users.module";

import { PromotionModule } from "src/promotion/promotion.module";
import { LikeModule } from "src/like/like.module";
import { ShareModule } from "src/share/share.module";
import { ReviewsModule } from "src/reviews/reviews.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogModule } from "src/email-log/email-log.module";
import { CategoryModule } from "src/category/category.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductView.name, schema: ProductViewSchema },
      { name: ProductContactClick.name, schema: ProductContactClickSchema },
      { name: ProductWhatsappClick.name, schema: ProductWhatsappClickSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    forwardRef(() => LikeModule),
    ShareModule,
    forwardRef(() => ShopModule), // If circular dependency
    forwardRef(() => SharedModule),
    forwardRef(() => UsersModule),
    // If LikeService is used in ProductsService
    forwardRef(() => PromotionModule), // If PromotionService is used in ProductsService
    forwardRef(() => ReviewsModule),
    ActivityLogModule,
    EmailLogModule,
    CategoryModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, EmailService],
  exports: [ProductsService],
})
export class ProductsModule { }
