import { ConfigService } from '@nestjs/config';
export declare class FileUploadService {
    private readonly configService;
    private s3;
    private bucketName;
    constructor(configService: ConfigService);
    uploadProductFiles(files: Express.Multer.File[], type: string, entityId: string, productId: string, fileType?: 'images' | 'video'): Promise<{
        key: string;
        url: string;
    }[]>;
}
