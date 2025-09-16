import { ConfigService } from '@nestjs/config';
export declare class FirebaseService {
    private readonly configService;
    constructor(configService: ConfigService);
    sendNotification(token: string, title: string, body: string): Promise<string>;
}
