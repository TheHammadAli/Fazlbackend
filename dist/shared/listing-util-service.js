"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingUtilsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("mongoose");
let ListingUtilsService = class ListingUtilsService {
    async findNearbyWithCategory(model, category, coordinates, radius, pagination) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;
        const data = await model.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates },
                    distanceField: 'distance',
                    maxDistance: radius * 1000,
                    query: { category: new mongoose_1.Types.ObjectId(category) },
                    spherical: true,
                },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            {
                $unwind: {
                    path: '$category',
                    preserveNullAndEmptyArrays: true,
                },
            },
        ]);
        const countAgg = await model.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates },
                    distanceField: 'distance',
                    maxDistance: radius,
                    query: { category: new mongoose_1.Types.ObjectId(category) },
                    spherical: true,
                },
            },
            {
                $count: 'total',
            },
        ]);
        const total = countAgg[0]?.total || 0;
        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data,
        };
    }
};
exports.ListingUtilsService = ListingUtilsService;
exports.ListingUtilsService = ListingUtilsService = __decorate([
    (0, common_1.Injectable)()
], ListingUtilsService);
//# sourceMappingURL=listing-util-service.js.map