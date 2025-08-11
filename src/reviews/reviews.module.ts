import { Module } from '@nestjs/common';
import { ReviewService } from './reviews.service';
import { ReviewController } from './reviews.controller';
import { Review, ReviewSchema } from './schema/review.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
      MongooseModule.forFeature([
        { name: Review.name, schema: ReviewSchema },
      ]),
    ],
  providers: [ReviewService],
  controllers: [ReviewController],
})
export class ReviewsModule {}
