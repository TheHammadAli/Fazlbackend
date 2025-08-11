// src/categories/category.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schema/category.schema';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import {
  CategoryRequest,
  CategoryRequestSchema,
} from './schema/category-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: CategoryRequest.name, schema: CategoryRequestSchema },
    ]),
  ],
  providers: [CategoryService],
  controllers: [CategoryController],
  exports: [CategoryService],
})
export class CategoryModule {}
