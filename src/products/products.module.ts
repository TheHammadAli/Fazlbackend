import { forwardRef, Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { VideoPostController } from "./video-post.controller";
import { ProductsService } from "./products.service";
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

// PrismaModule is @Global and exports PrismaService plus the repositories, so
// neither needs importing here — this replaces the Product, ProductView,
// ProductContactClick, ProductWhatsappClick and Counter model registrations.
@Module({
  imports: [
    forwardRef(() => LikeModule),
    ShareModule,
    forwardRef(() => ShopModule), // If circular dependency
    forwardRef(() => SharedModule),
    forwardRef(() => UsersModule),
    forwardRef(() => PromotionModule), // If PromotionService is used in ProductsService
    forwardRef(() => ReviewsModule),
    ActivityLogModule,
    EmailLogModule,
  ],
  controllers: [ProductsController, VideoPostController],
  providers: [ProductsService, EmailService],
  exports: [ProductsService],
})
export class ProductsModule {}
