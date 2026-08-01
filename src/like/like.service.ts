import {
  Injectable,
  NotFoundException,
  ConflictException,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Like, LikeDocument } from "./schema/like.schema";
import { CreateLikeDto, RemoveLikeDto } from "./dto/like.dto";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { I18nService } from "nestjs-i18n";
import { ClsService } from "nestjs-cls";

export interface LikeItem {
  _id: Types.ObjectId;
  itemId: Types.ObjectId;
  itemType: "product" | "service";
  ownerModel: "Shop" | "User";
  createdAt: Date;
}

export interface PopulatedLikeItem extends LikeItem {
  itemDetails?: any;
}

@Injectable()
export class LikeService {
  constructor(
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => ServicesService))
    private readonly servicesService: ServicesService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
  ) { }

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /**a
   * Add a like/favorite
   */
  async addLike(
    userId: string,
    dto: CreateLikeDto,
  ): Promise<{ message: string; data: Like }> {
    const userObjectId = new Types.ObjectId(userId);
    const itemObjectId = new Types.ObjectId(dto.itemId);

    await this.validateItemExists(dto.itemId, dto.itemType);

    const existingLike = await this.likeModel.findOne({
      userId: userObjectId,
      itemId: itemObjectId,
      itemType: dto.itemType,
    });

    if (existingLike) {
      throw new ConflictException(
        this.i18n.translate("auth.like.already_liked", { lang: this.lang }),
      );
    }

    const like = new this.likeModel({
      userId: userObjectId,
      itemId: itemObjectId,
      itemType: dto.itemType,
      ownerModel: dto.ownerModel,
    });

    const results = await like.save();
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      message: this.i18n.translate("auth.like.created_success", {
        lang: this.lang,
      }),
      data: results,
    };
  }

  /**
   * Remove like
   */
  async removeLike(
    userId: string,
    dto: RemoveLikeDto,
  ): Promise<{ message: string }> {
    const result = await this.likeModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      itemId: new Types.ObjectId(dto.itemId),
      itemType: dto.itemType,
    });

    if (!result) {
      throw new NotFoundException(
        this.i18n.translate("auth.like.not_found", { lang: this.lang }),
      );
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      message: this.i18n.translate("auth.like.removed", { lang: this.lang }),
    };
  }

  /**
   * Get likes for a user
   */
  async getLikesByUser(
    userId: string,
    itemType?: "product" | "service",
    ids?: Types.ObjectId[],
  ): Promise<PopulatedLikeItem[]> {
    if (!userId) {
      return []
    }
    const userObjectId = new Types.ObjectId(userId);

    const query: any = { userId: userObjectId };
    if (itemType) query.itemType = itemType;
    if (ids && ids.length > 0) query.itemId = { $in: ids };

    const likes = await this.likeModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean<LikeItem[]>();

    const populatedLikes = await Promise.all(
      likes.map(async (like) => {
        if (!like.itemId) return null;

        let itemDetails: any = null;

        try {
          if (like.itemType === "product") {
            itemDetails = await this.productsService.getById(
              like.itemId.toString(),
            );
          } else if (like.itemType === "service") {
            itemDetails = await this.servicesService.getById(
              like.itemId.toString(),
            );
          }
        } catch (error) {
          // optional logging
          // console.warn('Item not found:', like.itemId);
        }

        if (!itemDetails) return null;

        return {
          ...like,
          itemDetails,
        };
      }),
    );

    return populatedLikes.filter(Boolean) as PopulatedLikeItem[];
  }

  /**
   * Check if liked
   */
  async isLiked(
    userId: string,
    itemId: string,
    itemType: "product" | "service",
  ): Promise<boolean> {
    const exists = await this.likeModel.exists({
      userId: new Types.ObjectId(userId),
      itemId: new Types.ObjectId(itemId),
      itemType,
    });

    return !!exists;
  }

  /**
   * Count likes
   */
  async getLikeCount(
    itemId: string,
    itemType: "product" | "service",
  ): Promise<number> {
    return this.likeModel.countDocuments({
      itemId: new Types.ObjectId(itemId),
      itemType,
    });
  }

  /**
   * Validate item exists
   */
  private async validateItemExists(
    itemId: string,
    itemType: "product" | "service",
  ): Promise<void> {
    if (itemType === "product") {
      const product = await this.productsService.getById(itemId);

      if (!product) {
        throw new NotFoundException(
          this.i18n.translate("auth.like.product_not_found", {
            lang: this.lang,
          }),
        );
      }
    }

    if (itemType === "service") {
      const service = await this.servicesService.getById(itemId);

      if (!service) {
        throw new NotFoundException(
          this.i18n.translate("auth.like.service_not_found", {
            lang: this.lang,
          }),
        );
      }
    }
  }
}
