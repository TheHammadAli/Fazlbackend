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
import { Counter, CounterDocument } from "src/common/schema/counter.schema";

import { CreateBroadcastDto } from "./dto/create-broadcast.dto";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";

import { ShopService } from "../shop/shop.service";
import { UsersService } from "src/users/users.service";
import { CategoryService } from "src/category/category.service";
import { ServicesService } from "src/services/services.service";
import { ProductsService } from "src/products/products.service";
import { NotificationsService } from "src/notifications/notifications.service";
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

    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,

    private readonly shopService: ShopService,
    private readonly categoryService: CategoryService,
    private readonly userService: UsersService,
    private readonly servicesService: ServicesService,
    private readonly productsService: ProductsService,
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
    private readonly cls: ClsService,
    private readonly broadcastGateway: BroadcastGateway,
  ) { }

  private get lang(): string {
    return this.cls.get("lang") || "en";
  }

  /** Atomically reserves the next sequential broadcast code (e.g. ECH-000001). */
  private async generateNextBroadcastCode(): Promise<string> {
    const counter = await this.counterModel.findByIdAndUpdate(
      "broadcastCode",
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return `ECH-${String(counter.seq).padStart(6, "0")}`;
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

    const broadcastCode = await this.generateNextBroadcastCode();

    return this.broadcastModel.create({
      broadcastCode,
      buyer: new Types.ObjectId(buyerId),
      message: dto.message,
      address: dto.address,
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

    await new Promise(resolve => setTimeout(resolve, 2000));

    await this.messageModel.insertMany(initialMessages);

    // 3. GET BUYER AND CATEGORY INFO FOR NOTIFICATIONS
    const buyer = await this.userService.findUserById(buyerId);

    console.log("Buyer info for notifications:", buyer, isCategoryValid);
    // 4. SEND NOTIFICATIONS TO ALL SELLERS
    const notificationPromises = sellerIds.map((sellerId) =>
      this.notificationsService.createAndNotify(
        sellerId,
        "broadcast_created",
        "PROMOTION",
        {
          broadcastId: broadcast._id.toString(),
          buyerId,
          message: dto.message || "📢 New broadcast request",
          purpose: dto.purpose,
          broadcastType: dto.type,
          category: dto.categoryId,
          radius: dto.radius,
          address: dto.address,
          imageUrls: imageUrls || [],
        },
        {
          broadcastType: dto.type === "product" ? "Product" : "Service",
          buyer: buyer?.name,
          categoryName: isCategoryValid?.name?.[this.lang] || "Unknown Category",
          purpose: dto.purpose,
        },
      ),
    );

    await Promise.allSettled(notificationPromises);

    return {
      message: this.i18n.translate("auth.broadcast.created_success", {
        lang: this.lang,
      }),
      data: {
        id: broadcast._id.toString(),
      }
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
  // -----------------------------
  // GET BROADCASTS CREATED BY BUYER (Improved)
  // -----------------------------
  // -----------------------------
  // GET BROADCASTS CREATED BY BUYER (Fixed)
  // -----------------------------
  // -----------------------------
  // GET BROADCASTS CREATED BY BUYER (With Multilingual Category)
  // -----------------------------
  // -----------------------------
  // GET BROADCASTS CREATED BY BUYER (Full Category Object)
  // -----------------------------
  async getBroadcastsByBuyer(
    userId: string,
    page = 1,
    limit = 10,
  ) {
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new BadRequestException(
        this.i18n.translate("common.invalid_pagination", { lang: this.lang }),
      );
    }

    const skip = (pageNum - 1) * limitNum;
    const buyerObjectId = new Types.ObjectId(userId);

    const broadcasts = await this.broadcastModel.aggregate([
      { $match: { buyer: buyerObjectId } },

      // 1. Threads count
      {
        $lookup: {
          from: "broadcastthreads",
          localField: "_id",
          foreignField: "broadcast",
          as: "threads",
        },
      },
      { $addFields: { threadCount: { $size: "$threads" } } },

      // 2. Category
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
      },

      // 3. Latest Message (with imageUrls)
      {
        $lookup: {
          from: "broadcastmessages",
          let: { broadcastId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$broadcast", "$$broadcastId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "sender",
              },
            },
            { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                message: 1,
                createdAt: 1,
                imageUrls: 1,           // ← ADD THIS
                type: 1,                // optional
                sender: { _id: 1, name: 1, image: 1 },
              },
            },
          ],
          as: "latestMessage",
        },
      },
      {
        $unwind: { path: "$latestMessage", preserveNullAndEmptyArrays: true },
      },

      // 4. Extract imageUrls from latest message (fallback to empty array)
      {
        $addFields: {
          imageUrls: {
            $ifNull: ["$latestMessage.imageUrls", []],
          },
        },
      },

      // Optional: Keep initial SYSTEM message if you still need it for something else
      // (you can remove this block if not needed)
      {
        $lookup: {
          from: "broadcastmessages",
          let: { broadcastId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$broadcast", "$$broadcastId"] },
                type: "SYSTEM",
              },
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
          ],
          as: "initialMessage",
        },
      },
      {
        $unwind: { path: "$initialMessage", preserveNullAndEmptyArrays: true },
      },

      // Final Projection
      {
        $project: {
          _id: 1,
          broadcastCode: 1,
          message: 1,
          address: 1,
          purpose: 1,
          radius: 1,
          type: 1,
          createdAt: 1,
          updatedAt: 1,
          threadCount: 1,
          imageUrls: 1,
          latestMessage: 1,
          category: 1,
          // initialMessage: 1, // remove if not needed
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]);

    const total = await this.broadcastModel.countDocuments({ buyer: buyerObjectId });

    return {
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      data: broadcasts,
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
        .select("broadcast").lean()
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
      .populate("category")
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

  async getAllBroadcastsForAdmin(
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const dateMatchStage: Record<string, any> = { isDeleted: { $ne: true } };
    if (startDate || endDate) {
      dateMatchStage.createdAt = {};
      if (startDate) {
        dateMatchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateMatchStage.createdAt.$lte = endOfDay;
      }
    }

    const pipeline: any[] = [
      { $match: dateMatchStage },
      {
        $lookup: {
          from: "users",
          localField: "buyer",
          foreignField: "_id",
          as: "buyerInfo",
        },
      },
      { $unwind: { path: "$buyerInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "broadcastthreads",
          localField: "_id",
          foreignField: "broadcast",
          as: "threads",
        },
      },
      {
        $lookup: {
          from: "broadcastmessages",
          let: { broadcastId: "$_id", buyerId: "$buyer" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$broadcast", "$$broadcastId"] },
                    { $ne: ["$sender", "$$buyerId"] },
                  ],
                },
              },
            },
          ],
          as: "sellerMessages",
        },
      },
      {
        $addFields: {
          sentTo: { $size: "$threads" },
          repliedSellers: {
            $size: { $setUnion: ["$sellerMessages.sender", []] },
          },
        },
      },
    ];

    const matchStage: Record<string, any> = {};
    if (status?.trim()) {
      matchStage.status = status.trim().toLowerCase();
    }
    if (search?.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      matchStage.$or = [{ message: regex }, { "buyerInfo.name": regex }];
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $project: {
          broadcastCode: 1,
          message: 1,
          purpose: 1,
          type: 1,
          status: 1,
          createdAt: 1,
          sentTo: 1,
          repliedSellers: 1,
          "buyerInfo._id": 1,
          "buyerInfo.name": 1,
        },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "count" }],
        },
      },
    );

    const result = await this.broadcastModel.aggregate(pipeline).exec();
    const data = result[0]?.data ?? [];
    const total = result[0]?.totalCount?.[0]?.count ?? 0;

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getBroadcastRecipients(broadcastId: string) {
    if (!Types.ObjectId.isValid(broadcastId)) {
      throw new BadRequestException("Invalid broadcast id");
    }

    const broadcastExists = await this.broadcastModel.exists({
      _id: broadcastId,
      isDeleted: { $ne: true },
    });
    if (!broadcastExists) {
      throw new NotFoundException("Broadcast not found");
    }

    const recipients = await this.threadModel.aggregate([
      { $match: { broadcast: new Types.ObjectId(broadcastId) } },
      {
        $lookup: {
          from: "users",
          localField: "seller",
          foreignField: "_id",
          as: "sellerInfo",
        },
      },
      { $unwind: { path: "$sellerInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "broadcastmessages",
          let: { threadId: "$_id", sellerId: "$seller" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$thread", "$$threadId"] },
                    { $eq: ["$sender", "$$sellerId"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: 1 } },
            { $limit: 1 },
            { $project: { createdAt: 1 } },
          ],
          as: "firstReply",
        },
      },
      {
        $addFields: {
          hasReplied: { $gt: [{ $size: "$firstReply" }, 0] },
          repliedAt: { $arrayElemAt: ["$firstReply.createdAt", 0] },
        },
      },
      {
        $project: {
          sellerId: "$sellerInfo._id",
          name: "$sellerInfo.name",
          email: "$sellerInfo.email",
          image: "$sellerInfo.image",
          phone: "$sellerInfo.phone",
          sentAt: "$createdAt",
          hasReplied: 1,
          repliedAt: 1,
        },
      },
      { $sort: { sentAt: -1 } },
    ]);

    return {
      data: recipients,
      meta: { total: recipients.length },
    };
  }

  async closeBroadcast(broadcastId: string) {
    if (!Types.ObjectId.isValid(broadcastId)) {
      throw new BadRequestException("Invalid broadcast id");
    }
    const broadcast = await this.broadcastModel.findByIdAndUpdate(
      broadcastId,
      { $set: { status: "closed" } },
      { new: true },
    );
    if (!broadcast) {
      throw new NotFoundException("Broadcast not found");
    }
    return { message: "Broadcast closed successfully", data: broadcast };
  }

  async deleteBroadcast(broadcastId: string) {
    if (!Types.ObjectId.isValid(broadcastId)) {
      throw new BadRequestException("Invalid broadcast id");
    }
    const broadcast = await this.broadcastModel.findByIdAndUpdate(
      broadcastId,
      { $set: { isDeleted: true } },
      { new: true },
    );
    if (!broadcast) {
      throw new NotFoundException("Broadcast not found");
    }
    return { message: "Broadcast deleted successfully", data: broadcast };
  }
}
