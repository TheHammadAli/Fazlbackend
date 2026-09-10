import { forwardRef, Module } from "@nestjs/common";
import { ServicesService } from "./services.service";
import { ServicesController } from "./services.controller";
import { ServiceVideoPostController } from "./service-video-post.controller";
import { SharedModule } from "src/shared/shared.module";
import { UsersModule } from "src/users/users.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { LikeModule } from "src/like/like.module";
import { ShareModule } from "src/share/share.module";
import { ReviewsModule } from "src/reviews/reviews.module";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogModule } from "src/email-log/email-log.module";
import { CategoryModule } from "src/category/category.module";

// PrismaModule is @Global and exports PrismaService plus the repositories, so
// neither needs importing here — this replaces the Service, ServiceRequest,
// ServiceView, ServiceContactClick, ServiceWhatsappClick and Counter model
// registrations. Every other import is unchanged from the original.
@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => LikeModule),
    ShareModule,
    forwardRef(() => SharedModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ReviewsModule),
    EmailLogModule,
    // CategoryModule imports SharedModule, which imports this module back —
    // same cycle ProductsModule already guards against with this same
    // forwardRef, for the same reason (a video post resolves its sentinel
    // category through CategoryService).
    forwardRef(() => CategoryModule),
  ],
  providers: [ServicesService, EmailService],
  controllers: [ServicesController, ServiceVideoPostController],
  exports: [ServicesService],
})
export class ServicesModule {}
