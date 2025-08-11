import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Service, ServiceDocument } from './schema/services.schema';
import { Model, Types } from 'mongoose';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ListingUtilsService } from 'src/shared/listing-util-service';
import { UsersService } from 'src/users/users.service';
import { HandleRequestDto } from './dto/handle-request.do';
import { ServiceRequest, ServiceRequestDocument } from './schema/service_request.schema';
import { SearchAllProductsServiceDto } from 'src/search/dto/product-service-search-for.dto';
import { UpdateJobStatusDto } from './dto/update-job-dto';
import { UpdateRequestStatusDto } from './dto/update-request-dto';
import { CreateRequestDto } from './dto/create-request-dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly listingUtils: ListingUtilsService,
    @InjectModel(ServiceRequest.name) private readonly requestModel: Model<ServiceRequestDocument>,
  ) { }

  async create(userId: string, dto: CreateServiceDto): Promise<Service> {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new NotFoundException('user not found');
    }

    const created = await this.serviceModel.create({
      ...dto,
      ownerId: new Types.ObjectId(userId),
      category: new Types.ObjectId(dto.category),
      location: user.location,
    });
    return created.populate('category');
  }

  async update(serviceId: string, dto: UpdateServiceDto): Promise<Service> {
    const updated = await this.serviceModel
      .findByIdAndUpdate(
        serviceId,
        {
          ...dto,
          ...(dto.category && { category: new Types.ObjectId(dto.category) }),
        },
        { new: true },
      )
      .populate('category');

    if (!updated) {
      throw new NotFoundException('Service not found');
    }

    return updated;
  }

  async delete(serviceId: string): Promise<void> {
    const result = await this.serviceModel.findByIdAndDelete(serviceId);
    if (!result) {
      throw new NotFoundException('Service not found');
    }
  }

  async getById(serviceId: string): Promise<Service> {
    const service = await this.serviceModel
      .findById(serviceId)
      .populate('category');

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async getByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponseDto<Service>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.serviceModel
        .find({ ownerId: new Types.ObjectId(userId) })
        .populate('category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.serviceModel.countDocuments({ shopId: new Types.ObjectId(userId) }),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: data,
    };
  }

  async searchNearbyWithCategory(
    category: string,
    coordinates: [number, number],
    radius: number,
    pagination: PaginationDto,
  ) {
    return this.listingUtils.findNearbyWithCategory(
      this.serviceModel,
      category,
      coordinates,
      radius,
      pagination,
    );
  }
  async updateLocationByShopId(
    shopId: string,
    location: { type: 'Point'; coordinates: [number, number] },
  ) {
    await this.serviceModel.updateMany({ shopId }, { $set: { location } });
  }

  async searchServices(query: SearchAllProductsServiceDto) {
    // Build filter only with present fields
    const filter: Record<string, any> = {};

    if (query.name) {
      filter.title = { $regex: query.name, $options: 'i' };
    }
    if (query.category) {
      filter.category = new Types.ObjectId(query.category);
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.serviceModel.find(filter).skip(skip).limit(limit).populate('category').exec(),
      this.serviceModel.countDocuments(filter),
    ]);

    return {
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: results,
    };
  }

  async createServiceRequest(dto: CreateRequestDto) {
    const {
      serviceId,
      customerId,
      providerId,
      requestedDateTime,

      message,
    } = dto;

    // --- Validation: User Existence ---
    const customer = customerId ? await this.userService.findUserById(customerId) : null;
    const provider = providerId ? await this.userService.findUserById(providerId) : null;

    if (customerId && !customer) throw new NotFoundException('Customer not found');
    if (providerId && !provider) throw new NotFoundException('Provider not found');

    // --- Creation Flow ---

    if (!serviceId || !requestedDateTime || !customerId) {
      throw new BadRequestException('Missing required fields for request creation');
    }

    const service = await this.serviceModel.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');

    const request = new this.requestModel({
      service: serviceId,
      customer: customerId,
      provider: service.ownerId,
      requestedDateTime: new Date(requestedDateTime),
      status: 'pending',
      jobStatus: 'not_started',
      message,
    });

    return request.save();

  }
  async updateRequestStatus(dto: UpdateRequestStatusDto) {
    const { requestId, action, proposedDateTime } = dto;

    const request = await this.requestModel.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    switch (action) {
      case 'accept':
        request.status = 'accepted';
        break;

      case 'reject':
        request.status = 'rejected';
        break;

      case 'cancel':
        request.status = 'cancelled';
        break;

      case 'propose':
        if (!proposedDateTime) throw new BadRequestException('Proposed date is required');
        request.status = 'proposed';
        request.proposedDateTime = new Date(proposedDateTime);
        break;

      default:
        throw new BadRequestException(`Unsupported action: ${action}`);
    }

    return request.save();
  }


  async updateJobStatus(dto: UpdateJobStatusDto) {
    const { requestId, action } = dto;

    const request = await this.requestModel.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    switch (action) {
      case 'start_job':
        request.jobStatus = 'in_progress';
        request.status = 'accepted'; // keep it consistent
        break;

      case 'complete_job':
        request.jobStatus = 'completed';
        request.status = 'confirmed'; // e.g. to mark client approval phase
        break;

      default:
        throw new BadRequestException(`Unsupported job action: ${action}`);
    }

    return request.save();
  }

  async getServiceRequestsByUser(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<ServiceRequest>> {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.requestModel
        .find({
          $or: [
            { customer: new Types.ObjectId(userId) },
            { provider: new Types.ObjectId(userId) },
          ],
        })
        .populate('service')
        .populate('customer')
        .populate('provider')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.requestModel.countDocuments({
        $or: [
          { customer: new Types.ObjectId(userId) },
          { provider: new Types.ObjectId(userId) },
        ],
      }),
    ]);

    if (!requests || requests.length === 0) {
      throw new NotFoundException('No service requests found for this user');
    }
    return {
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: requests,
    };
  }
}
