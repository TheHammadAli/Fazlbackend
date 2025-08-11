import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUpdateUserDto } from './dto/create-update-User.dto';
import { User } from './schema/users.schema';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('createUser')
  @ApiOperation({ summary: 'Create a new user (public)' })
  @ApiBody({ type: CreateUpdateUserDto })
  @ApiBearerAuth(undefined) // 👈 This hides the lock icon and Bearer field in Swagger
  async createUser(@Body() createUserDto: CreateUpdateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    if (!user) {
      throw new InternalServerErrorException();
    }
    return user;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user (protected)' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: CreateUpdateUserDto })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: CreateUpdateUserDto,
  ): Promise<User> {
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: 'Get user detail by ID (protected)' })
  @ApiParam({ name: 'id', type: String })
  async getUser(@Param('id') userId: string): Promise<User> {
    return this.usersService.findUserById(userId);
  }

  @Get('allUsers')
  @ApiOperation({ summary: 'Get paginated list of all users (protected)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllUsers(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.usersService.getAllUsers({ page, limit });
  }
}
