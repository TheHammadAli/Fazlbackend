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

      const clientEmail = this.configService.get<string>("FIREBASE_CLIENT_EMAIL");

      if (!projectId || !privateKey || !clientEmail) {
        throw new Error("Missing Firebase environment variables");
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
      this.logger.error("Firebase initialization failed", err as any);
    }
  }

  /**
   * Sends a notification with an optional data payload
   * @param payload Optional Record for deep-linking or custom logic
   */
  async sendNotification(
    token: string,
    title: string,
    body: string,
    payload: Record<string, any> = {}, // Added payload parameter
  ): Promise<string | null> {
    try {
      if (!admin.apps.length) {
        this.logger.warn("Firebase not initialized. Skipping notification.");
        return null;
      }

      // 1️⃣ Sanitize payload: FCM 'data' values MUST be strings.
      const sanitizedData: Record<string, string> = {};
      Object.entries(payload).forEach(([key, value]) => {
        sanitizedData[key] = typeof value === 'object' 
          ? JSON.stringify(value) 
          : String(value);
      });

      // 2️⃣ Send message
      return await admin.messaging().send({
        token,
        notification: { title, body }, // The visual alert
        data: sanitizedData,           // The logic payload
        // Optional: High priority for instant delivery
        android: { priority: 'high' },
        apns: { payload: { aps: { contentAvailable: true } } }, 
      });
    } catch (err) {
      this.logger.error("FCM error (notification skipped)", err as any);
      return null;
    }
  }
}