import { Module } from "@nestjs/common";
import { ReviewService } from "./reviews.service";
import { ReviewController } from "./reviews.controller";

// PrismaModule is @Global and exports both PrismaService and ReviewRepository,
// so neither needs importing here — this replaces the Review model registration.
@Module({
  providers: [ReviewService],
  controllers: [ReviewController],
  exports: [ReviewService],
})
export class ReviewsModule {}
