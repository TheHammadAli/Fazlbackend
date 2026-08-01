import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LikeController } from "./like.controller";
import { LikeService } from "./like.service";
import { Like, LikeSchema } from "./schema/like.schema";

import { ProductsModule } from "src/products/products.module";
import { ServicesModule } from "src/services/services.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Like.name, schema: LikeSchema }]),

    forwardRef(() => ProductsModule),
    forwardRef(() => ServicesModule),
  ],
  controllers: [LikeController],
  providers: [LikeService],
  exports: [LikeService],
})
export class LikeModule {}
