import { Controller, Post, Get, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order-dto';
import { UpdateOrderDto } from './dto/update-order-dto';
import { Order } from './schema/order.schema';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Orders')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new order' })
    @ApiResponse({ status: 201, description: 'Order created', type: Order })
    async createOrder(@Body() dto: CreateOrderDto): Promise<Order> {
        return this.ordersService.createOrder(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order found', type: Order })
    async getOrderById(@Param('id') id: string): Promise<Order> {
        return this.ordersService.getOrderById(id);
    }

    @Get('owner/:ownerId')
    @ApiOperation({ summary: 'Get paginated orders by owner (Shop or User)' })
    @ApiParam({ name: 'ownerId', description: 'Owner ID (Shop or User)' })
    @ApiQuery({ name: 'ownerModel', enum: ['Shop', 'User'], required: true })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: 'Paginated orders found',
        schema: {
            example: {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
            }
        }
    })
    async getOrdersByOwner(
        @Param('ownerId') ownerId: string,
        @Query('ownerModel') ownerModel: 'Shop' | 'User',
        @Query() pagination: PaginationDto,
    ) {
        return this.ordersService.getOrdersByOwner(
            ownerId,
            ownerModel,
            pagination.page,
            pagination.limit,
        );
    }

    @Get('buyer/:buyerId')
    @ApiOperation({ summary: 'Get paginated orders by buyer' })
    @ApiParam({ name: 'buyerId', description: 'Buyer User ID' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: 'Paginated orders found',
        schema: {
            example: {
                data: [],
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
            }
        }
    })
    async getOrdersByBuyer(
        @Param('buyerId') buyerId: string,
        @Query() pagination: PaginationDto,
    ) {
        return this.ordersService.getOrdersByBuyer(
            buyerId,
            pagination.page,
            pagination.limit,
        );
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 200, description: 'Order updated', type: Order })
    async updateOrder(
        @Param('id') id: string,
        @Body() dto: UpdateOrderDto,
    ): Promise<Order> {
        return this.ordersService.updateOrder(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an order' })
    @ApiParam({ name: 'id', description: 'Order ID' })
    @ApiResponse({ status: 204, description: 'Order deleted' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteOrder(@Param('id') id: string): Promise<void> {
        return this.ordersService.deleteOrder(id);
    }
}