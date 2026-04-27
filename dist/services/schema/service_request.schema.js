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
exports.ServiceRequestSchema = exports.ServiceRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ServiceRequest = class ServiceRequest {
    service;
    customer;
    provider;
    requestedDateTime;
    proposedDateTime;
    status;
    jobStatus;
    message;
    completedAt;
    startedAt;
};
exports.ServiceRequest = ServiceRequest;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Service', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServiceRequest.prototype, "service", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServiceRequest.prototype, "customer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ServiceRequest.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], ServiceRequest.prototype, "requestedDateTime", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ServiceRequest.prototype, "proposedDateTime", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['pending', 'accepted', 'rejected', 'proposed', 'cancelled',],
        default: 'pending',
    }),
    __metadata("design:type", String)
], ServiceRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
    }),
    __metadata("design:type", String)
], ServiceRequest.prototype, "jobStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], ServiceRequest.prototype, "message", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ServiceRequest.prototype, "completedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ServiceRequest.prototype, "startedAt", void 0);
exports.ServiceRequest = ServiceRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ServiceRequest);
exports.ServiceRequestSchema = mongoose_1.SchemaFactory.createForClass(ServiceRequest);
//# sourceMappingURL=service_request.schema.js.map