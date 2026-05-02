import { forwardRef, Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { User, UserSchema } from "./schema/users.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { SharedModule } from "src/shared/shared.module";
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => SharedModule),
  ],
  controllers: [UsersController],
  exports: [UsersService],
  providers: [UsersService],
})
export class UsersModule {}
