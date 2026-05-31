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
exports.BroadcastSchema = exports.Broadcast = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Broadcast = class Broadcast {
    buyer;
    message;
    purpose;
    category;
    radius;
    location;
    type;
    expiresAt;
    lastResponseAt;
};
exports.Broadcast = Broadcast;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, ref: "User" }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Broadcast.prototype, "buyer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], Broadcast.prototype, "message", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ["Buying", "Selling"], required: true }),
    __metadata("design:type", String)
], Broadcast.prototype, "purpose", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Category" }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Broadcast.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], Broadcast.prototype, "radius", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: true,
        },
    }),
    __metadata("design:type", Object)
], Broadcast.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ["product", "service"], required: true }),
    __metadata("design:type", String)
], Broadcast.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Broadcast.prototype, "expiresAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Broadcast.prototype, "lastResponseAt", void 0);
exports.Broadcast = Broadcast = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Broadcast);
exports.BroadcastSchema = mongoose_1.SchemaFactory.createForClass(Broadcast);
exports.BroadcastSchema.index({ location: "2dsphere" });
exports.BroadcastSchema.index({ buyer: 1, createdAt: -1 });
//# sourceMappingURL=broadcast.schema.js.map