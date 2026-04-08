"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesModule = void 0;
const common_1 = require("@nestjs/common");
const services_service_1 = require("./services.service");
const services_controller_1 = require("./services.controller");
const mongoose_1 = require("@nestjs/mongoose");
const services_schema_1 = require("./schema/services.schema");
const shared_module_1 = require("../shared/shared.module");
const users_module_1 = require("../users/users.module");
const service_request_schema_1 = require("./schema/service_request.schema");
const notifications_module_1 = require("../notifications/notifications.module");
let ServicesModule = class ServicesModule {
};
exports.ServicesModule = ServicesModule;
exports.ServicesModule = ServicesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            (0, common_1.forwardRef)(() => shared_module_1.SharedModule),
            (0, common_1.forwardRef)(() => notifications_module_1.NotificationsModule),
            mongoose_1.MongooseModule.forFeature([{ name: services_schema_1.Service.name, schema: services_schema_1.ServiceSchema }, { name: service_request_schema_1.ServiceRequest.name, schema: service_request_schema_1.ServiceRequestSchema }]),
        ],
        providers: [services_service_1.ServicesService],
        controllers: [services_controller_1.ServicesController],
        exports: [services_service_1.ServicesService],
    })
], ServicesModule);
//# sourceMappingURL=services.module.js.map