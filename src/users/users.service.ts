import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUpdateUserDto } from './dto/create-update-User.dto';
import { AppError } from 'src/common/exceptions/app-error';
import { User, UserDocument } from './schema/users.schema';
import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginatedResponseDto } from 'src/common/dto/pagination-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { FileUploadService } from 'src/common/file-upload/file-upload.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>, private readonly fileUploadService: FileUploadService,) { }
  async createUser(createUserDto: CreateUpdateUserDto): Promise<User> {
    try {
      const existingUser = await this.userModel.findOne({
        email: createUserDto.email,
      });
      if (existingUser) {
        throw new ConflictException('Email is already registered');
      }
      const hashedPassword = await this.hashPassword(createUserDto.password);
      let imageUrl = "default-avatar.png"; // Default image URL

      const newUser = new this.userModel({
        ...createUserDto,
        image: "default-avatar.png", // Default image if none provided
        password: hashedPassword,
      });



      const savedUser = await newUser.save();

      if (createUserDto.image) {
        imageUrl = await this.fileUploadService.uploadUserImage(newUser._id as unknown as string, createUserDto.image); // Function to handle image upload
        savedUser.image = imageUrl; // Ensure the image is stored as a filename
      }
      await savedUser.save(); // Save the user again to update the image field
      return savedUser.toJSON();
    } catch (err) {
      throw new AppError(err);
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(password, salt);

  }


  async findUserByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ email }).exec();
  }

  async findByResetToken(
    resetPasswordToken: string,
  ): Promise<UserDocument | null> {
    const results = await this.userModel
      .findOne({ resetPasswordToken })
      .select('+resetPasswordExpires')
      .exec();
    if (!results) {
      throw new NotFoundException('User not found');
    }
    return results
  }

  async validateUserForLogin(
    email: string,
    password: string,
  ): Promise<UserDocument | false> {
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      return false
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return false
    }

    return user;
  }

  async updateUser(userId: string, updateData: Partial<UpdateUserDto>): Promise<User> {

    try {
      Object.keys(updateData).forEach((key) => {
        if (
          updateData[key] === '' ||   // empty string
          updateData[key] === null || // null
          typeof updateData[key] === 'undefined'
        ) {
          delete updateData[key]; // remove it from updateData
        }
      });

      if (updateData.password) {
        const salt = await bcrypt.genSalt();
        updateData.password = await bcrypt.hash(updateData.password, salt);
      }

      const existingUser = await this.userModel.findById(userId).exec();
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }
      let imageFile = updateData.image;
      updateData.image = existingUser.image; // Preserve existing image if not updated
      updateData.location = existingUser.location; // Preserve existing location if not updated
      const updateUser = await this.userModel.updateOne({ _id: userId }, { $set: updateData });
      if (updateUser.modifiedCount === 0) {
        throw new NotFoundException('No changes made to the user');
      }

      let imageUrl = existingUser.image; // Keep existing image URL if not updated
      if (imageFile) {
        imageUrl = await this.fileUploadService.uploadUserImage(userId, imageFile); // Function to handle image upload
      }

      updateData.image = imageUrl; // Ensure the image is stored as a filename



      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true },
      );

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }
      updatedUser.image = imageUrl; // Ensure the image is stored as a filename
      return updatedUser;
    } catch (err) {
      throw new AppError(err);
    }
  }

  async findByIdWithToken(userId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(userId)
      .select('+refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async findUserById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  async getAllUsers(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<User>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel.find().skip(skip).limit(limit).lean().exec(),
      this.userModel.countDocuments(),
    ]);

    return {

      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
