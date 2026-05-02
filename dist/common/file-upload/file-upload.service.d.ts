import { ConfigService } from "@nestjs/config";
export declare class FileUploadService {
    private readonly configService;
    private s3;
    private bucketName;
    constructor(configService: ConfigService);
    uploadProductFiles(files: Express.Multer.File[], type: string, entityId: string, productId: string, fileType?: "images" | "video"): Promise<{
        key: string;
        url: string;
    }[]>;
    uploadUserImage(userId: string, file: Express.Multer.File): Promise<string>;
    uploadShopImage(shopId: string, file: Express.Multer.File): Promise<string>;
    uploadServiceFile(userId: string, serviceId: string, files: Express.Multer.File[], fileType?: "images" | "video"): Promise<string[]>;
    deleteEntityProducts(type: string, entityId: string, productId?: string): Promise<void>;
    deleteFiles(media: string[]): Promise<void>;
    uploadChatMessage(conversationId: string, file: Express.Multer.File): Promise<string>;
    uploadBroadcastImage(buyerId: string, file: Express.Multer.File): Promise<string>;
    uploadBroadcastThreadImage(threadId: string, file: Express.Multer.File): Promise<string>;
}
