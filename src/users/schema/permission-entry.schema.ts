import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { ADMIN_ACTIONS, ADMIN_PERMISSIONS } from "src/common/constants/admin-permissions.constants";

@Schema({ _id: false })
export class PermissionEntry {
  @Prop({ type: String, enum: ADMIN_PERMISSIONS, required: true })
  page: string;

  @Prop({ type: [String], enum: ADMIN_ACTIONS, default: [] })
  actions: string[];
}

export type PermissionEntryDocument = PermissionEntry & Document;
export const PermissionEntrySchema = SchemaFactory.createForClass(PermissionEntry);
