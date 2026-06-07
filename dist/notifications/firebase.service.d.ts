export declare class FirebaseService {
    private readonly logger;
    private initialized;
    constructor();
    private initFirebase;
    private parseServiceAccountEnv;
    private stripOuterQuotes;
    private buildServiceAccountFromEnv;
    private normalizePrivateKey;
    sendNotification(token: string, title: string, body: string, payload?: Record<string, any>): Promise<string | null>;
}
