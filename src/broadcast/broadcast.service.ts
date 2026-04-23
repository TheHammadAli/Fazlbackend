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
    private readonly i18n: I18nService,
  ) {}

  // -----------------------------
  // CREATE BROADCAST
  // -----------------------------
  private async createBroadcast(
    dto: CreateBroadcastDto,
    buyerId: string,
    location: { type: string; coordinates: [number, number] },
  ) {
    // Check if broadcast already exists for this buyer and category
   

    return this.broadcastModel.create({
      buyer: new Types.ObjectId(buyerId),
      message: dto.message,
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
  ) {
    const radiusMeters = radiusKm * 1000;

    const shops = await this.shopService.findShopsNearLocation(
      location.coordinates,
      radiusMeters,
    );

    return shops.map((s) => s.ownerId.toString());
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
    lang: string = "en",
  ) {
    const isCategoryValid = await this.findCategorybyId(dto.categoryId);

    if (!isCategoryValid) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.category_invalid", { lang }),
      );
    }

    if(dto.type!== "product" && dto.type !== "service") {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.type_invalid", { lang }),
      );
    }

    let sellerIds: string[] = [];

    // Determine recipient IDs based on broadcast type
    if (dto.type === "product") {
      sellerIds = await this.findNearbySellers(location, dto.radius);
    } else if (dto.type === "service") {
      sellerIds = await this.findNearbyServiceProviders(
        location,
        dto.radius,
        dto.categoryId,
      );
    }

    sellerIds = sellerIds.filter(
      (ids) => ids.toString() !== buyerId.toString(),
    );

    if (!sellerIds.length) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.no_sellers_found", { lang }),
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

    // 2. CREATE INITIAL MESSAGES (IMPORTANT FIX)
    const initialMessages = threads.map((thread: any) => ({
      broadcast: broadcast._id,
      thread: thread._id,
      sender: new Types.ObjectId(buyerId),
      receiver: thread.seller,
      message: dto.message || "📢 New broadcast request",
      type: "SYSTEM",
    }));

    await this.messageModel.insertMany(initialMessages);

    return {
      message: this.i18n.translate("auth.broadcast.created_success", { lang }),
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
    lang: string = "en",
  ) {
    const broadcastObjectId = new Types.ObjectId(broadcastId);

    // 1. Validate broadcast
    const broadcast = await this.broadcastModel.findById(broadcastObjectId);
    if (!broadcast) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.broadcast_not_found", { lang }),
      );
    }

    // 2. Validate users
    const [sender, receiver] = await Promise.all([
      this.userService.findUserById(senderId),
      this.userService.findUserById(receiverId),
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException(
        this.i18n.translate("products.user_not_found", { lang }),
      );
    }

    // 3. Validate thread (SOURCE OF TRUTH)
    const thread = await this.threadModel.findById(threadId);

    if (!thread) {
      throw new NotFoundException(
        this.i18n.translate("auth.broadcast.thread_not_found", { lang }),
      );
    }

    // 4. Ensure thread belongs to broadcast
    if (thread.broadcast.toString() !== broadcastId) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.thread_invalid", { lang }),
      );
    }

    // 5. Validate sender is participant
    const isParticipant =
      thread.buyer.toString() === senderId ||
      thread.seller.toString() === senderId;

    if (!isParticipant) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.sender_not_in_thread", { lang }),
      );
    }

    // 6. Validate receiver is participant
    const isValidReceiver =
      thread.buyer.toString() === receiverId ||
      thread.seller.toString() === receiverId;

    if (!isValidReceiver) {
      throw new BadRequestException(
        this.i18n.translate("auth.broadcast.receiver_invalid", { lang }),
      );
    }

    // 7. Create message
    return this.messageModel.create({
      broadcast: broadcastObjectId,
      thread: new Types.ObjectId(threadId),
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      message,
    });
  }

  // -----------------------------
  // GET THREADS
  // -----------------------------
  async getBroadcastThreads(broadcastId: string) {
    return this.threadModel
      .find({
        broadcast: new Types.ObjectId(broadcastId),
      })
      .populate("buyer", "name")
      .populate("seller", "name")
      .sort({ createdAt: -1 });
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
