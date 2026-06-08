import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { I18nService } from "nestjs-i18n";

import { Broadcast } from "./schema/broadcast.schema";
import { BroadcastMessage } from "./schema/broadcast-message.schema";
import { BroadcastThread } from "./schema/broadcast-thread.schema";

import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";

import { ShopService } from "../shop/shop.service";
import { UsersService } from "src/users/users.service";
import { CategoryService } from "src/category/category.service";
import { ServicesService } from "src/services/services.service";
import { ProductsService } from "src/products/products.service";
import { ClsService } from "nestjs-cls";
import { BroadcastGateway } from "./broadcast.gateway";

@Injectable()
export class BroadcastService {
  constructor(
    @InjectModel(Broadcast.name)
    private readonly broadcastModel: Model<Broadcast>,

    @InjectModel(BroadcastMessage.name)
    private readonly messageModel: Model<BroadcastMessage>,

    @InjectModel(BroadcastThread.name)
    private readonly threadModel: Model<BroadcastThread>,

    private readonly shopService: ShopService,
    private readonly categoryService: CategoryService,
    private readonly userService: UsersService,
    private readonly servicesService: ServicesService,
    private readonly productsService: ProductsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly broadcastGateway: BroadcastGateway,
  ) { }

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  // -----------------------------
  // CREATE BROADCAST
  // -----------------------------
  private async createBroadcast(
    dto: CreateBroadcastDto,
    buyerId: string,
    location: { type: string; coordinates: [number, number] },
  ) {
    // Check if broadcast already exists for this buyer and category

    const results = await this.userService.findUserById(buyerId);
    if (!results) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    return this.broadcastModel.create({
      buyer: new Types.ObjectId(buyerId),
      message: dto.message,
      purpose: dto.purpose,
      radius: dto.radius,
      category: new Types.ObjectId(dto.categoryId),
      type: dto.type,
      location,
    });
  }

  // -----------------------------
  // FIND NEARBY SELLERS
  // -----------------------------
  private async findNearbySellers(
    location: { type: string; coordinates: [number, number] },
    radiusKm: number,
    categoryId: string,
  ) {
    const radiusMeters = radiusKm * 1000;

    const sellerIds = await this.productsService.findNearbyProductShopOwnerIds(
      categoryId,
      location.coordinates,
      radiusMeters,
    );
    console.log("Nearby sellers found:", sellerIds);
    return sellerIds;
  }

  // -----------------------------
  // FIND NEARBY SERVICE PROVIDERS
  // -----------------------------
  private async findNearbyServiceProviders(
    location: { type: string; coordinates: [number, number] },
    radiusKm: number,
    categoryId: string,
  ): Promise<string[]> {
    const radiusMeters = radiusKm * 1000;

    const services = await this.servicesService
      .getServiceModel()
      .find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: location.coordinates,
            },
            $maxDistance: radiusMeters,
          },
        },
        category: new Types.ObjectId(categoryId),
        isDeleted: false,
        isDisabled: false,
      })
      .lean()
      .exec();

    console.log("Services found:", services);
    // Extract unique owner IDs from services
    const ownerIds = [...new Set(services.map((s) => s.ownerId.toString()))];
    return ownerIds;
  }

  // -----------------------------
  // CATEGORY CHECK
  // -----------------------------
  private async findCategorybyId(categoryId: string) {
    return this.categoryService.findById(categoryId);
  }

  // -----------------------------
  // CREATE THREADS (NEW CORE LOGIC)
  // -----------------------------
  private async createBroadcastThreads(
    broadcastId: string,
    sellerIds: string[],
    buyerId: string,
  ) {
    const threadPromises = sellerIds.map((sellerId) =>
      this.threadModel.findOneAndUpdate(
        {
          broadcast: new Types.ObjectId(broadcastId),
          seller: new Types.ObjectId(sellerId),
        },
        {
          broadcast: new Types.ObjectId(broadcastId),
          buyer: new Types.ObjectId(buyerId),
          seller: new Types.ObjectId(sellerId),
        },
        { upsert: true, new: true },
      ),
    );

    const threads = await Promise.all(threadPromises);

    return threads;
  }

  // -----------------------------
  // MAIN: CREATE + DISPATCH
  // -----------------------------
  async createBroadcastAndDispatch(
    dto: CreateBroadcastDto,
    buyerId: string,
    location: { type: string; coordinates: [number, number] },
    imageUrls?: string[],
  ) {
    console.log("Creating broadcast with DTO:", dto);
    const isCategoryValid = await this.findCategorybyId(dto.categoryId);

    if (!isCategoryValid) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.category_invalid", {
          lang: this.lang,
        }),
      );
    }

    if (dto.type !== "product" && dto.type !== "service") {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.type_invalid", { lang: this.lang }),
      );
    }

    let sellerIds: string[] = [];

    // Determine recipient IDs based on broadcast type
    if (dto.type === "product") {
      sellerIds = await this.findNearbySellers(
        location,
        dto.radius,
        dto.categoryId,
      );
    } else if (dto.type === "service") {
      sellerIds = await this.findNearbyServiceProviders(
        location,
        dto.radius,
        dto.categoryId,
      );
    }

    sellerIds = [...new Set(sellerIds.map((id) => id.toString()))];
    sellerIds = sellerIds.filter((id) => id !== buyerId.toString());

    if (!sellerIds.length) {
      throw new BadRequestException(
        this.i18n.translate(dto.purpose === "Buying" ? "auth.broadcast.no_sellers_found" : "auth.broadcast.no_buyers_found", {
          lang: this.lang,
        }),
      );
    }

    const broadcast = await this.createBroadcast(dto, buyerId, location);
    console.log("Broadcast created:", broadcast);

    // 1. CREATE THREADS
    const threads = await this.createBroadcastThreads(
      broadcast._id.toString(),
      sellerIds,
      buyerId,
    );

    const uniqueThreads = Array.from(
      new Map(
        threads.map((thread: any) => [thread._id.toString(), thread]),
      ).values(),
    );

    console.log("Image Urls", imageUrls)
    // 2. CREATE INITIAL MESSAGES
    const initialMessages = uniqueThreads.map((thread: any) => ({
      broadcast: broadcast._id,
      thread: thread._id,
      sender: new Types.ObjectId(buyerId),
      receiver: thread.seller,
      message: dto.message || "📢 New broadcast request",
      type: "SYSTEM",
      imageUrls, // Include image URL if provided
    }));

    await this.messageModel.insertMany(initialMessages);

    return {
      message: this.i18n.translate("auth.broadcast.created_success", {
        lang: this.lang,
      }),
      data: broadcast._id.toString(),
    };
  }

  // -----------------------------
  // SEND MESSAGE (THREAD SAFE)
  // -----------------------------
  async sendBroadcastMessage(
    broadcastId: string,
    senderId: string,
    receiverId: string,
    threadId: string,
    message: string,
    imageUrl?: string,
  ) {
    const broadcastObjectId = new Types.ObjectId(broadcastId);

    // 1. Validate broadcast
    const broadcast = await this.broadcastModel.findById(broadcastObjectId);
    if (!broadcast) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", {
          lang: this.lang,
        }),
      );
    }

    // 2. Validate users
    const [sender, receiver] = await Promise.all([
      this.userService.findUserById(senderId),
      this.userService.findUserById(receiverId),
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException(
        this.i18n.translate("auth.products.user_not_found", {
          lang: this.lang,
        }),
      );
    }

    // 3. Validate thread (SOURCE OF TRUTH)
    const thread = await this.threadModel.findById(threadId);

    if (!thread) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.thread_not_found", {
          lang: this.lang,
        }),
      );
    }

    // 4. Ensure thread belongs to broadcast
    if (thread.broadcast.toString() !== broadcastId) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.thread_invalid", {
          lang: this.lang,
        }),
      );
    }

    // 5. Validate sender is participant
    const isParticipant =
      thread.buyer.toString() === senderId ||
      thread.seller.toString() === senderId;

    if (!isParticipant) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.sender_not_in_thread", {
          lang: this.lang,
        }),
      );
    }

    // 6. Validate receiver is participant
    const isValidReceiver =
      thread.buyer.toString() === receiverId ||
      thread.seller.toString() === receiverId;

    if (!isValidReceiver) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.receiver_invalid", {
          lang: this.lang,
        }),
      );
    }

    // 7. Create message
    const messageResults = await this.messageModel.create({
      broadcast: broadcastObjectId,
      thread: new Types.ObjectId(threadId),
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      message,
      imageUrls: [imageUrl], // Save the S3 URL here
    });

    this.broadcastGateway.server
      .to(threadId)
      .emit("receiveMessage", {
        message,
        sender,
        thread,
      });


    return {
      data: {

        message: messageResults,
        sender,
        thread: {
          id: threadId,
          buyer: thread.buyer,
          seller: thread.seller,
          broadcast: thread.broadcast,
        },
      }
    }
  }

  // -----------------------------
  // GET THREADS
  // -----------------------------
  async getBroadcastThreads(broadcastId: string) {
    return this.threadModel
      .aggregate([
        {
          $match: {
            broadcast: new Types.ObjectId(broadcastId),
          },
        },
        // Lookup buyer details
        {
          $lookup: {
            from: "users",
            localField: "buyer",
            foreignField: "_id",
            as: "buyer",
          },
        },
        {
          $unwind: {
            path: "$buyer",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup seller details
        {
          $lookup: {
            from: "users",
            localField: "seller",
            foreignField: "_id",
            as: "seller",
          },
        },
        {
          $unwind: {
            path: "$seller",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup latest message in this thread
        {
          $lookup: {
            from: "broadcastmessages",
            let: { threadId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$thread", "$$threadId"] },
                },
              },
              {
                $sort: { createdAt: -1 },
              },
              {
                $limit: 1,
              },
              {
                $lookup: {
                  from: "users",
                  localField: "sender",
                  foreignField: "_id",
                  as: "sender",
                },
              },
              {
                $unwind: {
                  path: "$sender",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  message: 1,
                  createdAt: 1,
                  sender: { _id: 1, name: 1 },
                },
              },
            ],
            as: "latestMessage",
          },
        },
        {
          $unwind: {
            path: "$latestMessage",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Project desired fields
        {
          $project: {
            _id: 1,
            broadcast: 1,
            buyer: { _id: 1, name: 1, image: 1 },
            seller: { _id: 1, name: 1, image: 1 },
            lastMessageAt: 1,
            createdAt: 1,
            updatedAt: 1,
            latestMessage: 1,
          },
        },
        {
          $sort: { "latestMessage.createdAt": -1, createdAt: -1 },
        },
      ])
      .exec();
  }

  // -----------------------------
  // GET THREAD MESSAGES
  // -----------------------------
  async getThreadMessages(threadId: string) {
    return this.messageModel
      .find({
        thread: new Types.ObjectId(threadId),
      })
      .populate("sender", "name")
      .populate("receiver", "name")
      .sort({ createdAt: 1 });
  }

  // -----------------------------
  // GET BROADCASTS CREATED BY BUYER
  // -----------------------------
  async getBroadcastsByBuyer(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<Broadcast>> {
    const skip = (page - 1) * limit;
    const filter = { buyer: new Types.ObjectId(userId) };

    const [data, total] = await Promise.all([
      this.broadcastModel
        .find(filter)
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.broadcastModel.countDocuments(filter),
    ]);

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

  // -----------------------------
  // GET BROADCASTS WHERE USER IS SELLER
  // -----------------------------
  async getBroadcastsForSeller(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<any>> {
    const skip = (page - 1) * limit;
    const userObjectId = new Types.ObjectId(userId);

    const [threads, total] = await Promise.all([
      this.threadModel
        .find({ seller: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("broadcast")
        .exec(),
      this.threadModel.countDocuments({ seller: userObjectId }),
    ]);

    const broadcastIds = threads.map((thread) => thread.broadcast);
    const threadMap = new Map(
      threads.map((thread: any) => [
        thread.broadcast.toString(),
        (thread._id as Types.ObjectId).toString(),
      ]),
    );

    const data = await this.broadcastModel
      .find({ _id: { $in: broadcastIds } })
      .populate("category", "name")
      .exec();

    // Maintain order and add threadId
    const broadcastIdOrder = threads.map((thread) =>
      thread.broadcast.toString(),
    );
    const dataMap = new Map(data.map((b) => [b._id.toString(), b]));
    const orderedData = broadcastIdOrder
      .map((id) => dataMap.get(id))
      .filter((b): b is NonNullable<typeof b> => b != null)
      .map((broadcast) => ({
        ...broadcast.toObject(),
        threadId: threadMap.get(broadcast._id.toString()),
      }));

    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: orderedData,
    };
  }
}
