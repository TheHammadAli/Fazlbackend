import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Promotion, PromotionSchema } from "./schema/promotion-schema";
import { PromotionService } from "./promotion.service";
import { PromotionController } from "./promotion.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
    ]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
