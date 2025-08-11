import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth-guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CreateRequestDto } from './dto/create-request-dto';
import { UpdateRequestStatusDto } from './dto/update-request-dto';
import { UpdateJobStatusDto } from './dto/update-job-dto';

@ApiTags('Services')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) { }


  @Post('create-request')
  @ApiOperation({ summary: 'Create a new service request' })
  @ApiBody({ type: CreateRequestDto })
  createRequest(@Body() dto: CreateRequestDto) {
    return this.servicesService.createServiceRequest(dto);
  }

  @Patch('status')
  @ApiOperation({ summary: 'Update the status of a request (accept, reject, cancel, confirm, propose)' })
  @ApiBody({ type: UpdateRequestStatusDto })
  updateStatus(@Body() dto: UpdateRequestStatusDto) {
    return this.servicesService.updateRequestStatus(dto);
  }

  @Patch('job-status')
  @ApiOperation({ summary: 'Update the job status of a request (start_job, complete_job)' })
  @ApiBody({ type: UpdateJobStatusDto })
  updateJobStatus(@Body() dto: UpdateJobStatusDto) {
    return this.servicesService.updateJobStatus(dto);
  }

  @Post(':userId')
  @ApiOperation({ summary: 'Create a new service for a user' })
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  async create(@Param('userId') userId: string, @Body() dto: CreateServiceDto) {
    return await this.servicesService.create(userId, dto);
  }

  @Put(':serviceId')
  @ApiOperation({ summary: 'Update an existing service' })
  @ApiParam({ name: 'serviceId', required: true })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  async update(
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return await this.servicesService.update(serviceId, dto);
  }

  @Delete(':serviceId')
  @ApiOperation({ summary: 'Delete a service' })
  @ApiParam({ name: 'serviceId', required: true })
  @ApiResponse({ status: 204, description: 'Service deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('serviceId') serviceId: string): Promise<void> {
    return await this.servicesService.delete(serviceId);
  }

  @Get(':serviceId')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiParam({ name: 'serviceId', required: true })
  @ApiResponse({ status: 200, description: 'Service found' })
  async getById(@Param('serviceId') serviceId: string) {
    return await this.servicesService.getById(serviceId);
  }

  @Get('/user/:userId')
  @ApiOperation({ summary: 'Get paginated services by user ID' })
  @ApiParam({ name: 'userId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of services',
  })
  async getByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedResponseDto<any>> {
    return this.servicesService.getByUser(userId, page, limit);
  }


  @Get('/requests/:userId')
  @ApiOperation({ summary: 'Get paginated services by user ID' })
  @ApiParam({ name: 'userId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of services',
  })
  async getServiceRequestsByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedResponseDto<any>> {
    return this.servicesService.getByUser(userId, page, limit);
  }




}
