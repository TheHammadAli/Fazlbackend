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
exports.BroadcastThreadSchema = exports.BroadcastThread = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let BroadcastThread = class BroadcastThread extends mongoose_2.Document {
    broadcast;
    buyer;
    seller;
    lastMessageAt;
};
exports.BroadcastThread = BroadcastThread;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "Broadcast", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BroadcastThread.prototype, "broadcast", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BroadcastThread.prototype, "buyer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: "User", required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BroadcastThread.prototype, "seller", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], BroadcastThread.prototype, "lastMessageAt", void 0);
exports.BroadcastThread = BroadcastThread = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], BroadcastThread);
exports.BroadcastThreadSchema = mongoose_1.SchemaFactory.createForClass(BroadcastThread);
exports.BroadcastThreadSchema.index({ broadcast: 1, seller: 1 }, { unique: true });
//# sourceMappingURL=broadcast-thread.schema.js.map