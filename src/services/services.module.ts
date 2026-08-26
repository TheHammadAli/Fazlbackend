import { forwardRef, Module } from "@nestjs/common";
import { ServicesService } from "./services.service";
import { ServicesController } from "./services.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Service, ServiceSchema } from "./schema/services.schema";
import { Counter, CounterSchema } from "src/common/schema/counter.schema";
import { SharedModule } from "src/shared/shared.module";
import { UsersModule } from "src/users/users.module";
import {
  ServiceRequest,
  ServiceRequestSchema,
} from "./schema/service_request.schema";
import { ServiceView, ServiceViewSchema } from "./schema/service-view.schema";
import { ServiceContactClick, ServiceContactClickSchema } from "./schema/service-contact-click.schema";
import { ServiceWhatsappClick, ServiceWhatsappClickSchema } from "./schema/service-whatsapp-click.schema";
import { NotificationsModule } from "src/notifications/notifications.module";
import { LikeModule } from "src/like/like.module";
import { ShareModule } from "src/share/share.module";
import { ReviewsModule } from "src/reviews/reviews.module";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogModule } from "src/email-log/email-log.module";
@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => LikeModule),
    ShareModule,
    forwardRef(() => SharedModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ReviewsModule),
    EmailLogModule,

    MongooseModule.forFeature([
      { name: Service.name, schema: ServiceSchema },
      { name: ServiceRequest.name, schema: ServiceRequestSchema },
      { name: ServiceView.name, schema: ServiceViewSchema },
      { name: ServiceContactClick.name, schema: ServiceContactClickSchema },
      { name: ServiceWhatsappClick.name, schema: ServiceWhatsappClickSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  providers: [ServicesService, EmailService],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule { }
