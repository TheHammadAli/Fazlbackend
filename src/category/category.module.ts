// src/categories/category.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CategoryController } from "./category.controller";
import { SharedModule } from "src/shared/shared.module";

// PrismaModule is @Global, so PrismaService needs no import here — this
// replaces the Category + CategoryRequest model registrations.
@Module({
  imports: [
    // ProductsModule imports CategoryModule, which closes a cycle back through
    // SharedModule (which imports ProductsModule) — needs forwardRef like every
    // other module on that cycle. Unrelated to the ORM.
    forwardRef(() => SharedModule),
  ],
  providers: [CategoryService],
  controllers: [CategoryController],
  exports: [CategoryService],
})
export class CategoryModule {}
