import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Product {
  @Prop({ type: Types.ObjectId, ref: "Shop", required: false })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: false })
  ownerId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: Types.ObjectId, ref: "Category", required: true })
  category: Types.ObjectId;

  @Prop({ type: String, enum: ["retail", "classified"], required: true })
  type: "retail" | "classified";

  @Prop({ type: [String], default: [] })
  images: string[];
  @Prop({ required: false, trim: true })
  video: string;

  @Prop({
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: "Point";
    coordinates: [number, number];
  };

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        variants: { type: [String], default: [] },
      },
    ],
    default: [],
    required: false,
  })
  parameters?: Array<{
    name: string;
    variants: string[];
  }>;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;


  @Prop({ type: [String], default: [] })
  searchableTags: string[];
}
// e.g. ["Color", "Red", "Blue", "Size", "S", "M", "L"]

export const ProductSchema = SchemaFactory.createForClass(Product);



function buildSearchableTags(
  parameters?: Array<{ name: string; variants: string[] }>
) {
  if (!Array.isArray(parameters)) {
    return [];
  }

  return [
    ...new Set(
      parameters.flatMap((param) => [
        param.name,
        ...(Array.isArray(param.variants) ? param.variants : []),
      ])
    ),
  ];
}

ProductSchema.pre("save", function (next) {
  this.searchableTags = buildSearchableTags(this.parameters);
  next();
});

ProductSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as any;

  if (!update) {
    return next();
  }

  const parameters =
    update.parameters || update.$set?.parameters;

  if (parameters) {
    if (!update.$set) {
      update.$set = {};
    }

    update.$set.searchableTags =
      buildSearchableTags(parameters);
  }

  next();
});



ProductSchema.index({ location: "2dsphere" });
ProductSchema.index({
  title: "text",
  description: "text",
  searchableTags: "text",
  // remove the old parameters.name / parameters.variants
});
export type ProductDocument = Product & Document;
