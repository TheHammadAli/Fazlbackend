import { Document, Types } from "mongoose";
export declare class Conversation extends Document {
    buyer: Types.ObjectId;
    seller: Types.ObjectId;
    status: string;
    lastMessageAt: Date;
}
export declare const ConversationSchema: import("mongoose").Schema<Conversation, import("mongoose").Model<Conversation, any, any, any, Document<unknown, any, Conversation, any> & Conversation & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Conversation, Document<unknown, {}, import("mongoose").FlatRecord<Conversation>, {}> & import("mongoose").FlatRecord<Conversation> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
