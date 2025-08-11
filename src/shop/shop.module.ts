import { forwardRef, Module } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Shop, ShopSchema } from './schema/shop.schema';
import { SharedModule } from 'src/shared/shared.module';
import { ProductsModule } from 'src/products/products.module';
import { ServicesModule } from 'src/services/services.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shop.name, schema: ShopSchema }]),
    forwardRef(() => SharedModule),
    forwardRef(() => ProductsModule),
    forwardRef(() => ServicesModule),
  ],
  providers: [ShopService],
  controllers: [ShopController],
  exports: [ShopService],
})
export class ShopModule {}
