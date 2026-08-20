import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/** Generic atomic-sequence counter, shared across modules that need a
 *  human-readable sequential code (e.g. userCode, shopCode, listingCode,
 *  serviceCode). One document per `_id` key in the "counters" collection. */
@Schema({ collection: "counters" })
export class Counter {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true, default: 0 })
  seq: number;
}

export type CounterDocument = Counter & Document;
export const CounterSchema = SchemaFactory.createForClass(Counter);
