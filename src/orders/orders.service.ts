import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order-dto';
import { UpdateOrderDto } from './dto/update-order-dto';
import { UsersService } from 'src/users/users.service';
import { ProductsService } from 'src/products/products.service';
import { ShopService } from 'src/shop/shop.service';

@Injectable()
export class OrdersService {
    constructor(
        @InjectModel(Order.name)
        private readonly orderModel: Model<OrderDocument>,
        private readonly usersService: UsersService,
        private readonly productsService: ProductsService,
        private readonly shopService: ShopService,
    ) { }

    // Create (Insert)
    async createOrder(dto: CreateOrderDto): Promise<Order> {
        // Check if buyer exists
        const buyer = await this.usersService.findUserById(dto.buyer);
        if (!buyer) throw new NotFoundException('Buyer not found');
        console.log("DTO:", dto);
        // Check if product exists
        const product = await this.productsService.getById(dto.product);
        if (!product) throw new NotFoundException('Product not found');
        console.log("Product:", product);
        // Check if owner exists (shop or user)
        let ownerExists = false;
        if (dto.ownerModel === 'Shop') {
            ownerExists = !!(await this.shopService.getShopById(dto.owner));
        } else if (dto.ownerModel === 'User') {
            ownerExists = !!(await this.usersService.findUserById(dto.owner));
        }
        if (!ownerExists) throw new NotFoundException('Order owner not found');

        let isValidOwner = false;
        if (dto.ownerModel === 'Shop') {
            isValidOwner = dto.owner === product.shopId.toString();
        }
        if (dto.ownerModel === 'User') {
            isValidOwner = dto.owner === product.ownerId?.toString();
        }

        if (!isValidOwner) {
            throw new BadRequestException('Order owner does not match product owner');
        }

        const order = new this.orderModel({
            ...dto,
            buyer: new Types.ObjectId(dto.buyer),
            owner: new Types.ObjectId(dto.owner),
            product: new Types.ObjectId(dto.product),
        });
        return order.save();
    }

    // Read (Get specific order by ID)
    async getOrderById(orderId: string): Promise<Order> {
        if (!Types.ObjectId.isValid(orderId)) throw new BadRequestException('Invalid order ID');
        const order = await this.orderModel.findById(orderId).populate('buyer').populate('product').populate('owner').exec();
        console.log({ "order": order });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    // Read (List orders, filter by owner discriminator) - Paginated and robust
    async getOrdersByOwner(
        ownerId: string,
        ownerModel: 'Shop' | 'User',
        page = 1,
        limit = 10,
    ): Promise<{ data: Order[]; total: number; page: number; limit: number; totalPages: number }> {
        if (!Types.ObjectId.isValid(ownerId)) throw new BadRequestException('Invalid owner ID');
        if (page < 1 || limit < 1) throw new BadRequestException('Page and limit must be greater than 0');
        // Check owner existence
        if (ownerModel === 'Shop') {
            const shop = await this.shopService.getShopById(ownerId);
            if (!shop) throw new NotFoundException('Shop owner not found');
        } else if (ownerModel === 'User') {
            const user = await this.usersService.findUserById(ownerId);
            if (!user) throw new NotFoundException('User owner not found');
        } else {
            throw new BadRequestException('Invalid ownerModel');
        }

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.orderModel
                .find({ owner: new Types.ObjectId(ownerId), ownerModel }).populate('product')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.orderModel.countDocuments({ owner: new Types.ObjectId(ownerId), ownerModel }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    // Read (List orders by buyer) - Paginated and robust
    async getOrdersByBuyer(
        buyerId: string,
        page = 1,
        limit = 10,
    ): Promise<{ data: Order[]; total: number; page: number; limit: number; totalPages: number }> {
        if (!Types.ObjectId.isValid(buyerId)) throw new BadRequestException('Invalid buyer ID');
        if (page < 1 || limit < 1) throw new BadRequestException('Page and limit must be greater than 0');
        const buyer = await this.usersService.findUserById(buyerId);
        if (!buyer) throw new NotFoundException('Buyer not found');

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.orderModel
                .find({ buyer: new Types.ObjectId(buyerId) }).populate('product').populate('owner')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.orderModel.countDocuments({ buyer: new Types.ObjectId(buyerId) }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    // Update
    async updateOrder(orderId: string, dto: UpdateOrderDto): Promise<Order> {
        if (!Types.ObjectId.isValid(orderId)) throw new BadRequestException('Invalid order ID');
        const updated = await this.orderModel.findByIdAndUpdate(orderId, dto, { new: true });
        if (!updated) throw new NotFoundException('Order not found');
        return updated;
    }

    // Delete
    async deleteOrder(orderId: string): Promise<void> {
        if (!Types.ObjectId.isValid(orderId)) throw new BadRequestException('Invalid order ID');
        const result = await this.orderModel.findByIdAndDelete(orderId);
        if (!result) throw new NotFoundException('Order not found');
    }
}