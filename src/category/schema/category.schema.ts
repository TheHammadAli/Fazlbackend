// src/categories/schema/category.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export enum CategoryType {
  SERVICE = "service",
  PRODUCT = "product",
}

@Schema({
  timestamps: true,
})
export class Category {
  @Prop({
    type: Map,
    of: String,
    required: true,
  })
  name!: Map<string, string>;

  @Prop({
    type: Map,
    of: String,
    required: false,
  })
  description?: Map<string, string>;

  @Prop({ default: false })
  isDisabled!: boolean;

  @Prop({
    required: true,
    enum: CategoryType,
  })
  type!: CategoryType;
}
export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);
