import { ConfigService } from "@nestjs/config";
export declare class FirebaseService {
    private readonly configService;
    private readonly logger;
    private initialized;
    constructor(configService: ConfigService);
    private initFirebase;
    sendNotification(token: string, title: string, body: string): Promise<string | null>;
}
