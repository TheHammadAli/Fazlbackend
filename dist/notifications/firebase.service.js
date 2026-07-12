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
var FirebaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const common_1 = require("@nestjs/common");
const admin = require("firebase-admin");
let FirebaseService = FirebaseService_1 = class FirebaseService {
    logger = new common_1.Logger(FirebaseService_1.name);
    initialized = false;
    constructor() {
        this.initFirebase();
    }
    initFirebase() {
        try {
            if (admin.apps.length || this.initialized)
                return;
            const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
            let serviceAccount;
            if (serviceAccountEnv) {
                serviceAccount = this.parseServiceAccountEnv(serviceAccountEnv);
            }
            if (!serviceAccount) {
                throw new Error("Firebase service account could not be loaded.");
            }
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            this.initialized = true;
            this.logger.log("Firebase initialized successfully");
        }
        catch (err) {
            this.logger.error("Firebase initialization failed", err);
        }
    }
    parseServiceAccountEnv(value) {
        const normalized = this.stripOuterQuotes(value);
        try {
            return JSON.parse(normalized);
        }
        catch (error) {
            this.logger.warn("FIREBASE_SERVICE_ACCOUNT json parsing failed, trying individual Firebase env vars.");
            return undefined;
        }
    }
    stripOuterQuotes(value) {
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        return value;
    }
    buildServiceAccountFromEnv() {
        const privateKey = this.normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || process.env.PRIVATE_KEY);
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;
        const clientId = process.env.FIREBASE_CLIENT_ID || process.env.CLIENT_ID;
        if (!projectId || !privateKey || !clientEmail) {
            return undefined;
        }
        return {
            type: process.env.TYPE || "service_account",
            project_id: projectId,
            private_key_id: process.env.PRIVATE_KEY_ID,
            private_key: privateKey,
            client_email: clientEmail,
            client_id: clientId,
            auth_uri: process.env.AUTH_URI,
            token_uri: process.env.TOKEN_URI,
            auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
            universe_domain: process.env.UNIVERSE_DOMAIN,
        };
    }
    normalizePrivateKey(key) {
        if (!key)
            return undefined;
        const trimmed = key.trim();
        const withoutQuotes = trimmed.startsWith('"') && trimmed.endsWith('"')
            ? trimmed.slice(1, -1)
            : trimmed;
        return withoutQuotes.replace(/\\n/g, "\n");
    }
    async sendNotification(token, title, body, payload = {}) {
        const isChatNotification = payload.type === "MESSAGE";
        const androidChannelId = isChatNotification
            ? "chat_message"
            : "marketing_service_channel";
        const soundName = isChatNotification ? "message" : "service_request";
        const iosSoundName = isChatNotification ? "message.wav" : "service_request.wav";
        try {
            if (!admin.apps.length) {
                this.logger.warn("Firebase not initialized. Skipping notification.");
                return null;
            }
            const sanitizedData = {};
            Object.entries(payload).forEach(([key, value]) => {
                sanitizedData[key] =
                    typeof value === "object" ? JSON.stringify(value) : String(value);
            });
            const androidConfigForFrontend = {
                notification: {
                    channelId: androidChannelId,
                    sound: soundName,
                },
            };
            const apnsConfigForFrontend = {
                payload: {
                    aps: {
                        sound: iosSoundName,
                        mutableContent: true,
                    },
                },
            };
            sanitizedData.android = JSON.stringify(androidConfigForFrontend);
            sanitizedData.apns = JSON.stringify(apnsConfigForFrontend);
            sanitizedData.notificationChannel = androidChannelId;
            sanitizedData.notificationSoundAndroid = soundName;
            sanitizedData.notificationSoundIos = iosSoundName;
            return await admin.messaging().send({
                token,
                notification: { title, body },
                data: sanitizedData,
                android: {
                    priority: "high",
                    notification: androidConfigForFrontend.notification,
                },
                apns: {
                    headers: {
                        "apns-priority": "10",
                    },
                    payload: {
                        aps: {
                            sound: isChatNotification ? iosSoundName : "default",
                            badge: 1,
                            mutableContent: true,
                            contentAvailable: true,
                        },
                    },
                },
            });
        }
        catch (err) {
            this.logger.error("FCM error (notification skipped)", err);
            return null;
        }
    }
};
exports.FirebaseService = FirebaseService;
exports.FirebaseService = FirebaseService = FirebaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FirebaseService);
//# sourceMappingURL=firebase.service.js.map