import { ConfigService } from "@nestjs/config";
export declare class FileUploadService {
    private readonly configService;
    private s3;
    private bucketName;
    private region;
    private cloudfrontDomain;
    constructor(configService: ConfigService);
    private getFileUrl;
    uploadProductFiles(files: Express.Multer.File[], type: string, entityId: string, productId: string, fileType?: "images" | "video"): Promise<{
        key: string;
        url: string;
    }[]>;
    uploadServiceFile(userId: string, serviceId: string, files: Express.Multer.File[], fileType?: "images" | "video"): Promise<string[]>;
    uploadUserImage(userId: string, file: Express.Multer.File): Promise<string>;
    uploadShopImage(shopId: string, file: Express.Multer.File): Promise<string>;
    uploadCategoryIcon(file: any): Promise<string>;
    uploadShopBanner(shopId: string, file: Express.Multer.File): Promise<string>;
    uploadChatMessage(conversationId: string, file: Express.Multer.File): Promise<string>;
    uploadBroadcastImage(buyerId: string, file: Express.Multer.File): Promise<string>;
    uploadBroadcastThreadImage(threadId: string, file: Express.Multer.File): Promise<string>;
    deleteEntityProducts(type: string, entityId: string, productId?: string): Promise<void>;
    deleteFiles(media: string[]): Promise<void>;
}
