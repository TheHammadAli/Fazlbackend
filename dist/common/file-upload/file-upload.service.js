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
    constructor(configService) {
        this.configService = configService;
        const region = this.configService.get('AWS_REGION');
        const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
        const bucket = this.configService.get('AWS_S3_BUCKET_NAME');
        if (!region || !accessKeyId || !secretAccessKey || !bucket) {
            throw new Error('Missing AWS S3 configuration');
        }
        console.log(`Initializing S3 client with bucket: ${bucket}`, accessKeyId, secretAccessKey, region);
        this.bucketName = bucket;
        this.s3 = new client_s3_1.S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }
    async uploadProductFiles(files, type, entityId, productId, fileType = 'images') {
        const uploadedFiles = [];
        console.log('Uploading files:', files);
        for (const file of files) {
            const fileExt = (0, path_1.extname)(file.originalname);
            const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
            let key = `${type}/${entityId}/products/${productId}/${fileType}/${uniqueName}`;
            if (fileType === 'video') {
                key = `${type}/${entityId}/products/${productId}/video`;
            }
            try {
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                });
                console.log(`Uploading file to S3 with key: ${key}`);
                await this.s3.send(command);
                const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
                console.log(`File uploaded successfully: ${url}`);
                uploadedFiles.push({ key, url });
            }
            catch (err) {
                console.error('S3 upload error:', err);
                throw new common_1.InternalServerErrorException('One or more file uploads failed');
            }
        }
        return uploadedFiles;
    }
    async uploadUserImage(userId, file) {
        const fileExt = (0, path_1.extname)(file.originalname);
        const key = `users/${userId}/images/profile-pic`;
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            console.log(`Uploading file to S3 with key: ${key}`);
            await this.s3.send(command);
            const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
            console.log(`File uploaded successfully: ${url}`);
            return url;
        }
        catch (err) {
            console.error('S3 upload error:', err);
            throw new common_1.InternalServerErrorException('One or more file uploads failed');
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
            console.log(`Uploading file to S3 with key: ${key}`);
            await this.s3.send(command);
            const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
            console.log(`File uploaded successfully: ${url}`);
            return url;
        }
        catch (err) {
            console.error('S3 upload error:', err);
            throw new common_1.InternalServerErrorException('One or more file uploads failed');
        }
    }
    async uploadServiceFile(userId, serviceId, files, fileType = 'images') {
        const uploadedFiles = [];
        console.log('Uploading files:', files);
        for (const file of files) {
            const fileExt = (0, path_1.extname)(file.originalname);
            const uniqueName = `${(0, uuid_1.v4)()}${fileExt}`;
            let key = `service/${userId}/${serviceId}/${fileType}/${uniqueName}`;
            if (fileType === 'video') {
                key = `service/${userId}/${serviceId}/video`;
            }
            try {
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                });
                console.log(`Uploading file to S3 with key: ${key}`);
                await this.s3.send(command);
                const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
                console.log(`File uploaded successfully: ${url}`);
                uploadedFiles.push(url);
            }
            catch (err) {
                console.error('S3 upload error:', err);
                throw new common_1.InternalServerErrorException('One or more file uploads failed');
            }
        }
        return uploadedFiles;
    }
    async deleteEntityProducts(type, entityId, productId) {
        try {
            const prefix = `${type}/${entityId}/products/${productId}`;
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: prefix,
            });
            console.log(`Deleting files from S3 with prefix: ${prefix}`);
            await this.s3.send(command);
            console.log(`Files deleted successfully from S3 with prefix: ${prefix}`);
        }
        catch (err) {
        }
    }
    async deleteFiles(media) {
        try {
            for (const path of media) {
                const key = path.split(`https://${this.bucketName}.s3.us-east-1.amazonaws.com/`)[1];
                if (!key)
                    throw new Error('Invalid S3 URL');
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                });
                console.log(`Deleting file from S3 with key: ${key}`);
                await this.s3.send(command);
                console.log(`File deleted successfully: ${key}`);
            }
        }
        catch (err) {
            console.error('S3 delete error:', err);
            throw new common_1.InternalServerErrorException('File deletion failed');
        }
    }
};
exports.FileUploadService = FileUploadService;
exports.FileUploadService = FileUploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FileUploadService);
//# sourceMappingURL=file-upload.service.js.map