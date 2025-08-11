import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateUpdateCategoryDto } from './dto/category-create-update.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import { CreateCategoryRequestDto } from './dto/category-request.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/strategies/jwt-strategy';
import { ReviewCategoryRequestDto } from './dto/review-category.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Categories')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category (admin only)' })
  @ApiBody({ type: CreateUpdateCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  create(@Body() dto: CreateUpdateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get('detail/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing category (admin only)' })
  @ApiBody({ type: CreateUpdateCategoryDto })
  update(@Param('id') id: string, @Body() dto: CreateUpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category by ID (admin only)' })
  delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @Post('request')
  @ApiOperation({ summary: 'Request a new category (user)' })
  @ApiBody({ type: CreateCategoryRequestDto })
  async createRequest(
    @Body() dto: CreateCategoryRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoryService.createRequest(dto, user.sub);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending category requests (admin only)' })
  async getPendingRequests() {
    return this.categoryService.getPendingRequests();
  }

  @Put('review/:id')
  @ApiOperation({ summary: 'Review a pending category request (admin only)' })
  @ApiBody({ type: ReviewCategoryRequestDto })
  async reviewRequest(
    @Param('id') id: string,
    @Body() dto: ReviewCategoryRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.categoryService.reviewRequestById(id, dto, user.sub);
  }
}
