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
const config_1 = require("@nestjs/config");
const admin = require("firebase-admin");
let FirebaseService = FirebaseService_1 = class FirebaseService {
    configService;
    logger = new common_1.Logger(FirebaseService_1.name);
    initialized = false;
    constructor(configService) {
        this.configService = configService;
        this.initFirebase();
    }
    initFirebase() {
        try {
            if (admin.apps.length || this.initialized)
                return;
            const projectId = this.configService.get("FIREBASE_PROJECT_ID");
            const privateKey = this.configService
                .get("FIREBASE_PRIVATE_KEY")
                ?.replace(/\\n/g, "\n");
            const clientEmail = this.configService.get("FIREBASE_CLIENT_EMAIL");
            if (!projectId || !privateKey || !clientEmail) {
                throw new Error("Missing Firebase environment variables (projectId/privateKey/clientEmail)");
            }
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    privateKey,
                    clientEmail,
                }),
            });
            this.initialized = true;
            this.logger.log("Firebase initialized successfully");
        }
        catch (err) {
            this.logger.error("Firebase initialization failed", err);
        }
    }
    async sendNotification(token, title, body) {
        try {
            if (!admin.apps.length) {
                this.logger.warn("Firebase not initialized. Skipping notification.");
                return null;
            }
            return await admin.messaging().send({
                token,
                notification: { title, body },
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
    __metadata("design:paramtypes", [config_1.ConfigService])
], FirebaseService);
//# sourceMappingURL=firebase.service.js.map