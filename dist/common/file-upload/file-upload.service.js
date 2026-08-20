"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const path_1 = require("path");
let FileUploadService = class FileUploadService {
    configService;
    s3;
    bucketName;
    region;
    cloudfrontDomain;
    constructor(configService) {
        this.configService = configService;
        const region = this.configService.get("AWS_REGION");
        const accessKeyId = this.configService.get("AWS_ACCESS_KEY_ID");
        const secretAccessKey = this.configService.get("AWS_SECRET_ACCESS_KEY");
        const bucketName = this.configService.get("AWS_S3_BUCKET_NAME");
        this.cloudfrontDomain = this.configService.get("CLOUDFRONT_DOMAIN");
        if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
            throw new Error("Missing AWS S3 configuration");
        }
        this.region = region;
        this.bucketName = bucketName;
        this.s3 = new client_s3_1.S3Client({
            region: this.region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }
    getFileUrl(key, isVideo = false) {
        if (isVideo && this.cloudfrontDomain) {
            return `${this.cloudfrontDomain}/${key}`;
        }
        return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    }
    async uploadProductFiles(files, type, entityId, productId, fileType = "images") {
        const uploadedFiles = [];
        for (const file of files) {
            const fileExt = (0, path_1.extname)(file.originalname);
            const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
            let key;
            if (fileType === "video") {
                key = `${type}/${entityId}/products/${productId}/video/${uniqueName}`;
            }
            else {
                key = `${type}/${entityId}/products/${productId}/${fileType}/${uniqueName}`;
            }
            try {
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    CacheControl: fileType === "video" ? "max-age=31536000" : "max-age=86400",
                });
                await this.s3.send(command);
                const url = this.getFileUrl(key, fileType === "video");
                uploadedFiles.push({ key, url });
            }
            catch (err) {
                console.error("S3 upload error:", err);
                throw new common_1.InternalServerErrorException("One or more file uploads failed");
            }
        }
        return uploadedFiles;
    }
    async uploadServiceFile(userId, serviceId, files, fileType = "images") {
        const uploadedFiles = [];
        for (const file of files) {
            const fileExt = (0, path_1.extname)(file.originalname);
            const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
            let key;
            if (fileType === "video") {
                key = `service/${userId}/${serviceId}/video/${uniqueName}`;
            }
            else {
                key = `service/${userId}/${serviceId}/${fileType}/${uniqueName}`;
            }
            try {
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    CacheControl: fileType === "video" ? "max-age=31536000" : "max-age=86400",
                });
                await this.s3.send(command);
                const url = this.getFileUrl(key, fileType === "video");
                uploadedFiles.push(url);
            }
            catch (err) {
                console.error("S3 upload error:", err);
                throw new common_1.InternalServerErrorException("One or more file uploads failed");
            }
        }
        return uploadedFiles;
    }
    async uploadUserImage(userId, file) {
        const key = `users/${userId}/images/profile-pic`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3.send(command);
            return this.getFileUrl(key, false);
        }
        catch (err) {
            console.error("S3 upload error:", err);
            throw new common_1.InternalServerErrorException("User image upload failed");
        }
    }
    async uploadShopImage(shopId, file) {
        const key = `shop/${shopId}/images/logo`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3.send(command);
            return this.getFileUrl(key, false);
        }
        catch (err) {
            console.error("S3 upload error:", err);
            throw new common_1.InternalServerErrorException("Shop image upload failed");
        }
    }
    async uploadCategoryIcon(file) {
        const fileExt = (0, path_1.extname)(file.originalname);
        const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
        const key = `categories/icons/${uniqueName}`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3.send(command);
            return this.getFileUrl(key, false);
        }
        catch (err) {
            console.error("S3 upload error:", err);
            throw new common_1.InternalServerErrorException("Category icon upload failed");
        }
    }
    async uploadAnnouncementImage(file) {
        const fileExt = (0, path_1.extname)(file.originalname);
        const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
        const key = `announcements/images/${uniqueName}`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3.send(command);
            return this.getFileUrl(key, false);
        }
        catch (err) {
            console.error("S3 upload error:", err);
            throw new common_1.InternalServerErrorException("Announcement image upload failed");
        }
    }
    async uploadShopBanner(shopId, file) {
        const key = `shop/${shopId}/images/banner`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3.send(command);
            return this.getFileUrl(key, false);
        }
        catch (err) {
            console.error("S3 upload error:", err);
            throw new common_1.InternalServerErrorException("Shop banner upload failed");
        }
    }
    async uploadChatMessage(conversationId, file) {
        const fileExt = (0, path_1.extname)(file.originalname);
        const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
        const key = `chats/${conversationId}/${uniqueName}`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3.send(command);
            return this.getFileUrl(key, false);
        }
        catch (err) {
            console.error("S3 upload error:", err);
            throw new common_1.InternalServerErrorException("Chat image upload failed");
        }
    }
    async uploadBroadcastImage(buyerId, file) {
        const fileExt = (0, path_1.extname)(file.originalname);
        const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
        const key = `broadcasts/${buyerId}/${uniqueName}`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3.send(command);
            return this.getFileUrl(key, false);
        }
        catch (err) {
            console.error("S3 upload error:", err);
            throw new common_1.InternalServerErrorException("Broadcast image upload failed");
        }
    }
    async uploadBroadcastThreadImage(threadId, file) {
        const fileExt = (0, path_1.extname)(file.originalname);
        const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
        const key = `broadcasts/threads/${threadId}/${uniqueName}`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            await this.s3.send(command);
            return this.getFileUrl(key, false);
        }
        catch (err) {
            console.error("S3 upload error:", err);
            throw new common_1.InternalServerErrorException("Thread image upload failed");
        }
    }
    async deleteEntityProducts(type, entityId, productId) {
        try {
            const prefix = productId
                ? `${type}/${entityId}/products/${productId}/`
                : `${type}/${entityId}/products/`;
            const listCommand = new client_s3_1.ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: prefix,
            });
            const listed = await this.s3.send(listCommand);
            if (!listed.Contents || listed.Contents.length === 0) {
                console.log(`No files found for prefix: ${prefix}`);
                return;
            }
            const deleteCommand = new client_s3_1.DeleteObjectsCommand({
                Bucket: this.bucketName,
                Delete: {
                    Objects: listed.Contents.map((item) => ({ Key: item.Key })),
                    Quiet: true,
                },
            });
            await this.s3.send(deleteCommand);
            console.log(`Deleted ${listed.Contents.length} files under: ${prefix}`);
        }
        catch (err) {
            console.error("S3 delete error:", err);
            throw new common_1.InternalServerErrorException("Failed to delete product files");
        }
    }
    async deleteFiles(media) {
        try {
            const keysToDelete = media
                .map((path) => {
                if (path.includes("amazonaws.com/")) {
                    return path.split("amazonaws.com/")[1];
                }
                if (this.cloudfrontDomain &&
                    path.includes(this.cloudfrontDomain)) {
                    return path.split(`${this.cloudfrontDomain}/`)[1];
                }
                return null;
            })
                .filter(Boolean);
            if (keysToDelete.length === 0)
                return;
            const deleteCommand = new client_s3_1.DeleteObjectsCommand({
                Bucket: this.bucketName,
                Delete: {
                    Objects: keysToDelete.map((Key) => ({ Key })),
                    Quiet: true,
                },
            });
            await this.s3.send(deleteCommand);
            console.log(`Deleted ${keysToDelete.length} files`);
        }
        catch (err) {
            console.error("S3 delete error:", err);
            throw new common_1.InternalServerErrorException("File deletion failed");
        }
    }
};
exports.FileUploadService = FileUploadService;
exports.FileUploadService = FileUploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FileUploadService);
//# sourceMappingURL=file-upload.service.js.map