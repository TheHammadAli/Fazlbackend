import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { CreateUpdateShopDto } from './dto/create-update-shop.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth-guard';
import { Request } from 'express';
import { Types } from 'mongoose';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtPayload } from 'src/auth/strategies/jwt-strategy';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Shops')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new shop' })
  @ApiBody({ type: CreateUpdateShopDto })
  async createShop(@Body() dto: CreateUpdateShopDto, @Req() req: Request) {
    const user = req.user as { sub: string };
    return this.shopService.createShop(new Types.ObjectId(user.sub), dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing shop by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: CreateUpdateShopDto })
  async updateShop(@Param('id') id: string, @Body() dto: CreateUpdateShopDto) {
    return this.shopService.updateShop(id, dto);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: 'Get shop details by ID' })
  @ApiParam({ name: 'id', type: String })
  async getShop(@Param('id') id: string) {
    return this.shopService.getShopById(id);
  }

  @Get('userShops')
  @ApiOperation({ summary: 'Get all shops owned by current user' })
  async getMyShops(@CurrentUser() user: JwtPayload) {
    return this.shopService.getAllShopsByUser(user.sub);
  }
}
