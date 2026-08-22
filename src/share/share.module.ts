import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ShareController } from "./share.controller";
import { ShareService } from "./share.service";
import { Share, ShareSchema } from "./schema/share.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Share.name, schema: ShareSchema }]),
  ],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule { }
