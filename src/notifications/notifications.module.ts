// notifications.module.ts
import { forwardRef, Module } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification, NotificationSchema } from './schema/notifications.schema';
import { FirebaseService } from './firebase.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'src/users/users.module';
import { NotificationsGateway } from './notification.gateway';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),  forwardRef(() => UsersModule), ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, FirebaseService],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule { }
