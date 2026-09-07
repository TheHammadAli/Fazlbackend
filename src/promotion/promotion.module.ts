import { Module } from "@nestjs/common";
import { PromotionService } from "./promotion.service";
import { PromotionController } from "./promotion.controller";

// PrismaModule is @Global, so PrismaService needs no import here.
@Module({
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
