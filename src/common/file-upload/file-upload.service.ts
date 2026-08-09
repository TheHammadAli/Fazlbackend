import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { extname } from "path";

@Injectable()
export class FileUploadService {
  private s3: S3Client;
  private bucketName: string;
  private region: string;
  private cloudfrontDomain: string | undefined;  // ← allow undefined

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>("AWS_REGION");
    const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>("AWS_SECRET_ACCESS_KEY");
    const bucketName = this.configService.get<string>("AWS_S3_BUCKET_NAME");
    this.cloudfrontDomain = this.configService.get<string>("CLOUDFRONT_DOMAIN");

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("Missing AWS S3 configuration");
    }

    // Now TypeScript knows these are strings
    this.region = region;
    this.bucketName = bucketName;

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  // ========== Helper ==========
  private getFileUrl(key: string, isVideo = false): string {
    if (isVideo && this.cloudfrontDomain) {
      return `${this.cloudfrontDomain}/${key}`;
    }

    // Images still use S3
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  // ========== Product Files ==========
  async uploadProductFiles(
    files: Express.Multer.File[],
    type: string,
    entityId: string,
    productId: string,
    fileType: "images" | "video" = "images",
  ): Promise<{ key: string; url: string }[]> {
    const uploadedFiles: { key: string; url: string }[] = [];

    for (const file of files) {
      const fileExt = extname(file.originalname);
      const uniqueName = `${uuidv4()}${fileExt}`;

      let key: string;

      if (fileType === "video") {
        // Unique key every time (no cache invalidation needed)
        key = `${type}/${entityId}/products/${productId}/video/${uniqueName}`;
      } else {
        key = `${type}/${entityId}/products/${productId}/${fileType}/${uniqueName}`;
      }

      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl:
            fileType === "video" ? "max-age=31536000" : "max-age=86400",
        });

        await this.s3.send(command);

        const url = this.getFileUrl(key, fileType === "video");
        uploadedFiles.push({ key, url });
      } catch (err) {
        console.error("S3 upload error:", err);
        throw new InternalServerErrorException(
          "One or more file uploads failed",
        );
      }
    }

    return uploadedFiles;
  }

  // ========== Service Files ==========
  async uploadServiceFile(
    userId: string,
    serviceId: string,
    files: Express.Multer.File[],
    fileType: "images" | "video" = "images",
  ): Promise<string[]> {
    const uploadedFiles: string[] = [];

    for (const file of files) {
      const fileExt = extname(file.originalname);
      const uniqueName = `${uuidv4()}${fileExt}`;

      let key: string;

      if (fileType === "video") {
        // Unique key every time
        key = `service/${userId}/${serviceId}/video/${uniqueName}`;
      } else {
        key = `service/${userId}/${serviceId}/${fileType}/${uniqueName}`;
      }

      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl:
            fileType === "video" ? "max-age=31536000" : "max-age=86400",
        });

        await this.s3.send(command);

        const url = this.getFileUrl(key, fileType === "video");
        uploadedFiles.push(url);
      } catch (err) {
        console.error("S3 upload error:", err);
        throw new InternalServerErrorException(
          "One or more file uploads failed",
        );
      }
    }

    return uploadedFiles;
  }

  // ========== User Image ==========
  async uploadUserImage(userId: string, file: Express.Multer.File) {
    const key = `users/${userId}/images/profile-pic`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3.send(command);
      return this.getFileUrl(key, false);
    } catch (err) {
      console.error("S3 upload error:", err);
      throw new InternalServerErrorException("User image upload failed");
    }
  }

  // ========== Shop Image ==========
  async uploadShopImage(shopId: string, file: Express.Multer.File) {
    const key = `shop/${shopId}/images/logo`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3.send(command);
      return this.getFileUrl(key, false);
    } catch (err) {
      console.error("S3 upload error:", err);
      throw new InternalServerErrorException("Shop image upload failed");
    }
  }

  // ========== Category Icon ==========
  async uploadCategoryIcon(file: any) {
    const fileExt = extname(file.originalname);
    const uniqueName = `${uuidv4()}${fileExt}`;
    const key = `categories/icons/${uniqueName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3.send(command);
      return this.getFileUrl(key, false);
    } catch (err) {
      console.error("S3 upload error:", err);
      throw new InternalServerErrorException("Category icon upload failed");
    }
  }

  // ========== Shop Banner ==========
  async uploadShopBanner(shopId: string, file: Express.Multer.File) {
    const key = `shop/${shopId}/images/banner`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3.send(command);
      return this.getFileUrl(key, false);
    } catch (err) {
      console.error("S3 upload error:", err);
      throw new InternalServerErrorException("Shop banner upload failed");
    }
  }

  // ========== Chat Message ==========
  async uploadChatMessage(
    conversationId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const fileExt = extname(file.originalname);
    const uniqueName = `${uuidv4()}${fileExt}`;
    const key = `chats/${conversationId}/${uniqueName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3.send(command);
      return this.getFileUrl(key, false);
    } catch (err) {
      console.error("S3 upload error:", err);
      throw new InternalServerErrorException("Chat image upload failed");
    }
  }

  // ========== Broadcast Image ==========
  async uploadBroadcastImage(
    buyerId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const fileExt = extname(file.originalname);
    const uniqueName = `${uuidv4()}${fileExt}`;
    const key = `broadcasts/${buyerId}/${uniqueName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3.send(command);
      return this.getFileUrl(key, false);
    } catch (err) {
      console.error("S3 upload error:", err);
      throw new InternalServerErrorException("Broadcast image upload failed");
    }
  }

  // ========== Broadcast Thread Image ==========
  async uploadBroadcastThreadImage(
    threadId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const fileExt = extname(file.originalname);
    const uniqueName = `${uuidv4()}${fileExt}`;
    const key = `broadcasts/threads/${threadId}/${uniqueName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3.send(command);
      return this.getFileUrl(key, false);
    } catch (err) {
      console.error("S3 upload error:", err);
      throw new InternalServerErrorException("Thread image upload failed");
    }
  }

  // ========== Delete all files under a product ==========
  async deleteEntityProducts(
    type: string,
    entityId: string,
    productId?: string,
  ): Promise<void> {
    try {
      const prefix = productId
        ? `${type}/${entityId}/products/${productId}/`
        : `${type}/${entityId}/products/`;

      // 1. List all objects under this prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const listed = await this.s3.send(listCommand);

      if (!listed.Contents || listed.Contents.length === 0) {
        console.log(`No files found for prefix: ${prefix}`);
        return;
      }

      // 2. Delete them in batch
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: listed.Contents.map((item) => ({ Key: item.Key! })),
          Quiet: true,
        },
      });

      await this.s3.send(deleteCommand);
      console.log(`Deleted ${listed.Contents.length} files under: ${prefix}`);
    } catch (err) {
      console.error("S3 delete error:", err);
      throw new InternalServerErrorException("Failed to delete product files");
    }
  }

  // ========== Delete specific files by URL ==========
  async deleteFiles(media: string[]): Promise<void> {
    try {
      const keysToDelete = media
        .map((path) => {
          if (path.includes("amazonaws.com/")) {
            return path.split("amazonaws.com/")[1];
          }
          if (
            this.cloudfrontDomain &&
            path.includes(this.cloudfrontDomain)
          ) {
            return path.split(`${this.cloudfrontDomain}/`)[1];
          }
          return null;
        })
        .filter(Boolean) as string[];

      if (keysToDelete.length === 0) return;

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keysToDelete.map((Key) => ({ Key })),
          Quiet: true,
        },
      });

      await this.s3.send(deleteCommand);
      console.log(`Deleted ${keysToDelete.length} files`);
    } catch (err) {
      console.error("S3 delete error:", err);
      throw new InternalServerErrorException("File deletion failed");
    }
  }
}