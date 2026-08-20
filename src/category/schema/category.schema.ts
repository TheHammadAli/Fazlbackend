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

  @Prop({
    type: {
      en: [
        {
          name: { type: String },
          values: [{ type: String }],
          isOptional: { type: Boolean, default: false },
          allowCustomValue: { type: Boolean, default: false },
          allowMultiple: { type: Boolean, default: false },
        },
      ],
      ur: [
        {
          name: { type: String },
          values: [{ type: String }],
          isOptional: { type: Boolean, default: false },
          allowCustomValue: { type: Boolean, default: false },
          allowMultiple: { type: Boolean, default: false },
        },
      ],
    },
    default: { en: [], ur: [] },
  })
  parameters?: {
    en: { name: string; values: string[]; isOptional?: boolean; allowCustomValue?: boolean; allowMultiple?: boolean }[];
    ur: { name: string; values: string[]; isOptional?: boolean; allowCustomValue?: boolean; allowMultiple?: boolean }[];
  };

  @Prop({ default: 0 })
  sortNumber!: number;

  @Prop({ default: false })
  isDisabled!: boolean;

  @Prop({ type: String, required: false })
  icon?: string;

  @Prop({
    required: true,
    enum: CategoryType,
  })
  type!: CategoryType;
}
export type CategoryDocument = Category & Document;


export const CategorySchema = SchemaFactory.createForClass(Category);
