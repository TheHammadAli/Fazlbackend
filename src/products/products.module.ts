import { forwardRef, Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { MongooseModule } from "@nestjs/mongoose";
import { Product, ProductSchema } from "./schema/product.schema";
import { ShopModule } from "src/shop/shop.module";
import { SharedModule } from "src/shared/shared.module";
import { UsersModule } from "src/users/users.module";

import { PromotionModule } from "src/promotion/promotion.module";
import { LikeModule } from "src/like/like.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    forwardRef(() => LikeModule),
    forwardRef(() => ShopModule), // If circular dependency
    forwardRef(() => SharedModule),
    forwardRef(() => UsersModule),
    // If LikeService is used in ProductsService
    forwardRef(() => PromotionModule), // If PromotionService is used in ProductsService
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
