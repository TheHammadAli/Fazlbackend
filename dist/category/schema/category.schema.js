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
exports.CategorySchema = exports.Category = exports.CategoryType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
var CategoryType;
(function (CategoryType) {
    CategoryType["SERVICE"] = "service";
    CategoryType["PRODUCT"] = "product";
})(CategoryType || (exports.CategoryType = CategoryType = {}));
let Category = class Category {
    name;
    description;
    isDisabled;
    icon;
    type;
};
exports.Category = Category;
__decorate([
    (0, mongoose_1.Prop)({
        type: Map,
        of: String,
        required: true,
    }),
    __metadata("design:type", Map)
], Category.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Map,
        of: String,
        required: false,
    }),
    __metadata("design:type", Map)
], Category.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Category.prototype, "isDisabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", String)
], Category.prototype, "icon", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: CategoryType,
    }),
    __metadata("design:type", String)
], Category.prototype, "type", void 0);
exports.Category = Category = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
    })
], Category);
exports.CategorySchema = mongoose_1.SchemaFactory.createForClass(Category);
//# sourceMappingURL=category.schema.js.map