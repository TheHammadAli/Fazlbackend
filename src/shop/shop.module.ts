import { forwardRef, Module } from "@nestjs/common";
import { ShopService } from "./shop.service";
import { ShopController } from "./shop.controller";
import { SharedModule } from "src/shared/shared.module";
import { ProductsModule } from "src/products/products.module";
import { ServicesModule } from "src/services/services.module";
import { UsersModule } from "src/users/users.module";
import { OrdersModule } from "src/orders/orders.module";
import { ActivityLogModule } from "src/activity-log/activity-log.module";
import { EmailService } from "src/common/email-service/email-service";
import { EmailLogModule } from "src/email-log/email-log.module";

// PrismaModule is @Global and exports PrismaService plus the repositories, so
// neither needs importing here — this replaces the Shop, ShopView,
// ShopProductView, ShopContactClick, ShopWhatsappClick and Counter model
// registrations.
@Module({
  imports: [
    forwardRef(() => SharedModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => OrdersModule),
    ActivityLogModule,
    EmailLogModule,
  ],
  providers: [ShopService, EmailService],
  controllers: [ShopController],
  exports: [ShopService],
})
export class ShopModule {}
