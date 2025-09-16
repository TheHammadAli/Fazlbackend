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
  async createUser(createUserDto: CreateUpdateUserDto) {
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
      console.log("User image", createUserDto.image);
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


  async findUserByEmail(email: string) {
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
      // Remove empty, null, or undefined fields
      Object.keys(updateData).forEach((key) => {
        if (
          updateData[key] === '' ||
          updateData[key] === null ||
          typeof updateData[key] === 'undefined'
        ) {
          delete updateData[key];
        }
      });

      // Handle password hashing
      if (updateData.password) {
        const salt = await bcrypt.genSalt();
        updateData.password = await bcrypt.hash(updateData.password, salt);
      }

      const existingUser = await this.userModel.findById(userId).exec();
      if (!existingUser) {
        throw new NotFoundException('User not found');
      }
      console.log("Existing User:", existingUser);

      // Handle image only if a new one is provided
      let imageUrl = existingUser.image || "default-avatar.png";
      console.log("Image URL:", imageUrl);
      console.log("Update Data Image:", updateData.image);
      if (
        updateData.image &&
        typeof updateData.image === "object" &&
        "buffer" in updateData.image &&
        "originalname" in updateData.image
      ) {
        // It's a file object (from Multer)
        imageUrl = await this.fileUploadService.uploadUserImage(userId, updateData.image);
      }

      // Preserve location if not updated
      if (!updateData.location) {
        updateData.location = existingUser.location;
      }

      updateData.image = imageUrl;

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: updateData },

      );

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

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

  async saveFcmToken(userId: string, token: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { fcmToken: token },
      { new: true },
    );
  }
}
