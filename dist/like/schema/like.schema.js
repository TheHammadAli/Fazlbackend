"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LikeSchema = exports.Like = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Like = class Like {
    userId;
    itemId;
    itemType;
    ownerModel;
};
exports.Like = Like;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Like.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Like.prototype, "itemId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: ["product", "service"],
    }),
    __metadata("design:type", String)
], Like.prototype, "itemType", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: ["Shop", "User"],
    }),
    __metadata("design:type", String)
], Like.prototype, "ownerModel", void 0);
exports.Like = Like = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    })
], Like);
exports.LikeSchema = mongoose_1.SchemaFactory.createForClass(Like);
exports.LikeSchema.index({ userId: 1, itemId: 1, itemType: 1 }, { unique: true });
//# sourceMappingURL=like.schema.js.map