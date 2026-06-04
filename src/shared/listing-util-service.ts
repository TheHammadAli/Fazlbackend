import { Injectable } from "@nestjs/common";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";

import { Model, Types } from "mongoose";

@Injectable()
export class ListingUtilsService {
  async findNearbyWithCategory<T>(
    model: Model<T>,
    category: string,
    coordinates: [number, number],
    radius: number,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<T>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Step 1: Aggregation for paginated data
    const data = await model.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates },
          distanceField: "distance",
          maxDistance: radius * 1000,
          query: { category: new Types.ObjectId(category), isDeleted: false, isDisabled: false },
          spherical: true,
        },

      },
      { $sort: { createdAt: -1 } }, // Optional: sort by creation date
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    // Step 2: Aggregation for total count
    const countAgg = await model.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates },
          distanceField: "distance",
          maxDistance: radius * 1000,
          query: { category: new Types.ObjectId(category), isDeleted: false, isDisabled: false },
          spherical: true,
        },
      },
      {
        $count: "total",
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
}
