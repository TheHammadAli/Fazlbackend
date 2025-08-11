import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Query,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Product } from './schema/product.schema';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { FileUploadService } from 'src/common/file-upload/file-upload.service';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Types } from 'mongoose';

@ApiTags('Products')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly fileUploadService: FileUploadService,
  ) { }

  @Post(':entityId/:type')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 5 }]))
  @ApiOperation({ summary: 'Create a new product (shop or personal listing)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'entityId',
    required: true,
    description: 'Shop ID or User ID depending on type',
  })
  @ApiParam({
    name: 'type',
    required: true,
    description: `'shop' for business listings, 'personal' for user-created listings`,
    enum: ['shop', 'personal'],
  })
  @ApiBody({
    description: 'Product data with optional image upload',
    type: CreateProductDto,
  })
  async createProduct(
    @Param('entityId') entityId: string,
    @Param('type') type: 'shop' | 'personal',

    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ): Promise<Product> {
    console.log
    let imageUrls: string[] = [];
    console.log("Files received:", files);
   
    createProductDto.parameters = JSON.parse(createProductDto.parameters?.toString() || '{}');

    console.log('Creating product with entityId:', entityId, 'and type:', type);
    console.log('Product DTO:', createProductDto);
    return this.productsService.create(entityId, type, createProductDto, files);
  }

  @Get(':shopId')
  @ApiOperation({ summary: 'Get all products for a shop' })
  @ApiParam({ name: 'shopId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllByShop(
    @Param('shopId') shopId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Product>> {
    return this.productsService.getAllProductsByShop(shopId, paginationDto);
  }


  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all products for a User' })
  @ApiParam({ name: 'userId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllProductsByUser(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Product>> {
    return this.productsService.getAllProductsByUser(userId, paginationDto);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: 'Get product details by ID' })
  @ApiParam({ name: 'id', required: true })
  async getById(@Param('id') id: string): Promise<Product> {
    return this.productsService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateProductDto })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product by ID' })
  @ApiParam({ name: 'id', required: true })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.productsService.delete(id);
    return { message: 'Product deleted successfully' };
  }
}
