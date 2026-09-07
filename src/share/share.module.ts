import { Module } from "@nestjs/common";
import { ShareService } from "./share.service";
import { ShareController } from "./share.controller";

// PrismaModule is @Global, so PrismaService needs no import here.
@Module({
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
