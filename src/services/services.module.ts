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
import { NotificationsModule } from "src/notifications/notifications.module";
import { LikeModule } from "src/like/like.module";
import { ReviewsModule } from "src/reviews/reviews.module";
@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => LikeModule),
    forwardRef(() => SharedModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ReviewsModule),

    MongooseModule.forFeature([
      { name: Service.name, schema: ServiceSchema },
      { name: ServiceRequest.name, schema: ServiceRequestSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  providers: [ServicesService],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule { }
