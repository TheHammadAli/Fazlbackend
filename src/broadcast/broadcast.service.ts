import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Broadcast } from './schema/broadcast.schema';
import { BroadcastMessage } from './schema/broadcast-message.schema';
import { BroadcastThread } from './schema/broadcast-thread.schema';

import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { ShopService } from '../shop/shop.service';
import { UsersService } from 'src/users/users.service';
import { CategoryService } from 'src/category/category.service';

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
  ) {}

  // -----------------------------
  // CREATE BROADCAST
  // -----------------------------
  private async createBroadcast(
    dto: CreateBroadcastDto,
    buyerId: string,
    location: { type: string; coordinates: [number, number] },
  ) {
    return this.broadcastModel.create({
      buyer: new Types.ObjectId(buyerId),
      message: dto.message,
      radius: dto.radius,
      categoryId: new Types.ObjectId(dto.categoryId),
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
    const threads = sellerIds.map((sellerId) => ({
      broadcast: new Types.ObjectId(broadcastId),
      buyer: new Types.ObjectId(buyerId),
      seller: new Types.ObjectId(sellerId),
    }));

    return this.threadModel.insertMany(threads);
  }

  // -----------------------------
  // MAIN: CREATE + DISPATCH
  // -----------------------------
  async createBroadcastAndDispatch(
    dto: CreateBroadcastDto,
    buyerId: string,
    location: { type: string; coordinates: [number, number] },
  ) {
    const isCategoryValid = await this.findCategorybyId(dto.categoryId);

    if (!isCategoryValid) {
      throw new BadRequestException('Category Invalid');
    }

    

    let sellerIds = await this.findNearbySellers(location, dto.radius);
 sellerIds = sellerIds.filter(ids => ids.toString() !== buyerId.toString())
    

    if (!sellerIds.length) {
     throw new BadRequestException('No sellers found in given radius');
    }

    const broadcast = await this.createBroadcast(dto, buyerId, location);

   
    

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
      message: dto.message || '📢 New broadcast request',
      type: 'SYSTEM',
    }));

    await this.messageModel.insertMany(initialMessages);

    return {
      message: 'Broadcast created and dispatched successfully',
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
  ) {
    const broadcastObjectId = new Types.ObjectId(broadcastId);

    // 1. Validate broadcast
    const broadcast = await this.broadcastModel.findById(broadcastObjectId);
    if (!broadcast) {
      throw new NotFoundException('Broadcast not found');
    }

    // 2. Validate users
    const [sender, receiver] = await Promise.all([
      this.userService.findUserById(senderId),
      this.userService.findUserById(receiverId),
    ]);

    if (!sender || !receiver) {
      throw new NotFoundException('User not found');
    }

    // 3. Validate thread (SOURCE OF TRUTH)
    const thread = await this.threadModel.findById(threadId);

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    // 4. Ensure thread belongs to broadcast
    if (thread.broadcast.toString() !== broadcastId) {
      throw new BadRequestException('Thread does not belong to broadcast');
    }

    // 5. Validate sender is participant
    const isParticipant =
      thread.buyer.toString() === senderId ||
      thread.seller.toString() === senderId;

    if (!isParticipant) {
      throw new BadRequestException('Sender not part of thread');
    }

    // 6. Validate receiver is participant
    const isValidReceiver =
      thread.buyer.toString() === receiverId ||
      thread.seller.toString() === receiverId;

    if (!isValidReceiver) {
      throw new BadRequestException('Invalid receiver for thread');
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
      .populate('buyer', 'name')
      .populate('seller', 'name')
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
      .populate('sender', 'name')
      .populate('receiver', 'name')
      .sort({ createdAt: 1 });
  }

  // -----------------------------
// GET BROADCASTS CREATED BY BUYER
// -----------------------------
async getBroadcastsByBuyer(userId: string) {
  return this.broadcastModel
    .find({
      buyer: new Types.ObjectId(userId),
    })
    .sort({ createdAt: -1 });
}

// -----------------------------
// GET BROADCASTS WHERE USER IS SELLER
// -----------------------------
async getBroadcastsForSeller(userId: string) {
  // 1. find threads where user is seller
  const threads = await this.threadModel.find({
    seller: new Types.ObjectId(userId),
  });

  const broadcastIds = threads.map((t) => t.broadcast);

  // 2. fetch broadcasts
  return this.broadcastModel
    .find({
      _id: { $in: broadcastIds },
    })
    .sort({ createdAt: -1 });
}
}
