// src/notifications/firebase.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      if (admin.apps.length || this.initialized) return;

      const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");
      const privateKey = this.configService
        .get<string>("FIREBASE_PRIVATE_KEY")
        ?.replace(/\\n/g, "\n");

      const clientEmail = this.configService.get<string>(
        "FIREBASE_CLIENT_EMAIL",
      );

      // ✅ Validate env vars (prevents silent crash)
      if (!projectId || !privateKey || !clientEmail) {
        throw new Error(
          "Missing Firebase environment variables (projectId/privateKey/clientEmail)",
        );
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        } as admin.ServiceAccount),
      });

      this.initialized = true;
      this.logger.log("Firebase initialized successfully");
    } catch (err) {
      // ❌ IMPORTANT: do NOT crash app if Firebase fails
      this.logger.error("Firebase initialization failed", err as any);
    }
  }

  async sendNotification(
    token: string,
    title: string,
    body: string,
  ): Promise<string | null> {
    try {
      if (!admin.apps.length) {
        this.logger.warn("Firebase not initialized. Skipping notification.");
        return null;
      }

      return await admin.messaging().send({
        token,
        notification: { title, body },
      });
    } catch (err) {
      // ❌ IMPORTANT: prevent crash from FCM failures
      this.logger.error("FCM error (notification skipped)", err as any);
      return null;
    }
  }
}
