import { forwardRef, Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Service, ServiceSchema } from './schema/services.schema';
import { SharedModule } from 'src/shared/shared.module';
import { UsersModule } from 'src/users/users.module';
import { ServiceRequest, ServiceRequestSchema } from './schema/service_request.schema';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => SharedModule),
    MongooseModule.forFeature([{ name: Service.name, schema: ServiceSchema }, { name: ServiceRequest.name, schema: ServiceRequestSchema }]),

  ],
  providers: [ServicesService],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule { }
