// src/notifications/firebase.service.ts
import { Injectable, Logger } from "@nestjs/common";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private initialized = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      if (admin.apps.length || this.initialized) return;

      const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
      let serviceAccount: admin.ServiceAccount | undefined;

      if (serviceAccountEnv) {
        serviceAccount = this.parseServiceAccountEnv(serviceAccountEnv);
      }

      if (!serviceAccount) {
        serviceAccount = this.buildServiceAccountFromEnv();
      }

      if (!serviceAccount) {
        throw new Error("Firebase service account could not be loaded.");
      }

      // Whichever source produced it, the JSON's private_key still has literal "\n" pairs
      // (escaped for single-line env storage) instead of real line breaks — Firebase's PEM
      // parser needs actual newlines, so this is applied unconditionally, not just on the
      // buildServiceAccountFromEnv() fallback path.
      const raw = serviceAccount as unknown as Record<string, string>;
      const rawPrivateKey = raw.private_key ?? raw.privateKey;
      if (rawPrivateKey) {
        const normalizedKey = this.normalizePrivateKey(rawPrivateKey);
        raw.private_key = normalizedKey!;
        raw.privateKey = normalizedKey!;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.initialized = true;
      this.logger.log("Firebase initialized successfully");
    } catch (err) {
      this.logger.error("Firebase initialization failed", err);
    }
  }

  private parseServiceAccountEnv(value: string): admin.ServiceAccount | undefined {
    const normalized = this.stripOuterQuotes(value);

    try {
      return JSON.parse(normalized) as admin.ServiceAccount;
    } catch (error) {
      this.logger.warn(
        "FIREBASE_SERVICE_ACCOUNT json parsing failed, trying individual Firebase env vars.",
      );
      return undefined;
    }
  }

  private stripOuterQuotes(value: string): string {
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    return value;
  }

  private buildServiceAccountFromEnv(): admin.ServiceAccount | undefined {
    const privateKey = this.normalizePrivateKey(
      process.env.FIREBASE_PRIVATE_KEY || process.env.PRIVATE_KEY,
    );
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.CLIENT_EMAIL;
    const clientId = process.env.FIREBASE_CLIENT_ID || process.env.CLIENT_ID;

    if (!projectId || !privateKey || !clientEmail) {
      return undefined;
    }
    //
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
    } as admin.ServiceAccount;
  }

  /**
   * Turns whatever shape the key arrived in into a real PEM.
   *
   * Besides the usual escaped newlines, the value can carry wrappers left over
   * from having been pasted through a JSON string into .env — a leading \" and a
   * trailing \"," have both been seen in practice. Those survive into the PEM and
   * make it undecodable, but credential.cert() still accepts it at startup because
   * it only checks the shape and never contacts Google. The damage then surfaces
   * much later, as app/invalid-credential on every single send, with a clean
   * "initialized successfully" line sitting in the log.
   */
  private normalizePrivateKey(key?: string): string | undefined {
    if (!key) return undefined;

    let value = key.trim();

    // Escaped quote wrappers from a mis-quoted .env value.
    value = value.replace(/^\\+"/, "").replace(/\\+",?"?$/, "");

    // Plain surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return value.replace(/\\n/g, "\n").trim();
  }

  /**
   * Builds the platform config shared by the single-token and multi-token
   * senders, so both produce an identical payload shape.
   */
  private buildMessageContent(
    title: string,
    body: string,
    payload: Record<string, any>,
  ) {
    const isChatNotification = payload.type === "MESSAGE";
    const androidChannelId = isChatNotification
      ? "chat_message"
      : "marketing_service_channel";
    const soundName = isChatNotification ? "message" : "service_request";
    const iosSoundName = isChatNotification ? "message.wav" : "service_request.wav";

    // Sanitize custom application payload: FCM 'data' values MUST be strings.
    const sanitizedData: Record<string, string> = {};
    Object.entries(payload).forEach(([key, value]) => {
      sanitizedData[key] =
        typeof value === "object" ? JSON.stringify(value) : String(value);
    });

    // Explicitly bundle configurations for the frontend to read inside 'data'
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

    // Add them directly to the data object so the frontend receives them
    sanitizedData.android = JSON.stringify(androidConfigForFrontend);
    sanitizedData.apns = JSON.stringify(apnsConfigForFrontend);

    // Keep legacy flat keys if your frontend is already expecting them
    sanitizedData.notificationChannel = androidChannelId;
    sanitizedData.notificationSoundAndroid = soundName;
    sanitizedData.notificationSoundIos = iosSoundName;

    // FCM reads top-level android/apns; frontend reads data
    return {
      notification: { title, body },
      data: sanitizedData,
      android: {
        priority: "high" as const,
        notification: androidConfigForFrontend.notification,
      },
      apns: {
        headers: {
          "apns-priority": "10", // 10 = Deliver immediately
        },
        payload: {
          aps: {
            // Explicit alert block ensures iOS matches the Firebase Console layout
            alert: {
              title: title,
              body: body,
            },
            sound: iosSoundName,
            badge: 1,
            mutableContent: true,
            // contentAvailable omitted so iOS doesn't treat it as a silent background event
          },
        },
      },
    };
  }

  /**
   * Sends a notification with an optional data payload
   * @param payload Optional Record for deep-linking or custom logic
   */
  async sendNotification(
    token: string,
    title: string,
    body: string,
    payload: Record<string, any> = {},
  ): Promise<string | null> {
    try {
      if (!admin.apps.length) {
        this.logger.warn("Firebase not initialized. Skipping notification.");
        return null;
      }

      return await admin.messaging().send({
        token,
        ...this.buildMessageContent(title, body, payload),
      });
    } catch (err) {
      this.logger.error("FCM error (notification skipped)", err);
      return null;
    }
  }

  /**
   * Fans one notification out to every device a user has registered.
   *
   * Returns the subset of `tokens` FCM rejected as permanently dead (app
   * uninstalled, token rotated, browser storage cleared) so the caller can drop
   * them — without pruning, a user's token list only ever grows and each dead
   * entry costs a wasted FCM round-trip on every later notification.
   */
  async sendNotificationToTokens(
    tokens: string[],
    title: string,
    body: string,
    payload: Record<string, any> = {},
  ): Promise<{ successCount: number; staleTokens: string[] }> {
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    if (uniqueTokens.length === 0) {
      return { successCount: 0, staleTokens: [] };
    }

    try {
      if (!admin.apps.length) {
        this.logger.warn("Firebase not initialized. Skipping notification.");
        return { successCount: 0, staleTokens: [] };
      }

      const staleTokens: string[] = [];
      let successCount = 0;

      // sendEachForMulticast caps at 500 tokens per call.
      for (let i = 0; i < uniqueTokens.length; i += 500) {
        const batch = uniqueTokens.slice(i, i + 500);
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batch,
          ...this.buildMessageContent(title, body, payload),
        });

        successCount += response.successCount;

        response.responses.forEach((result, index) => {
          if (result.success) return;
          const code = result.error?.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token" ||
            code === "messaging/invalid-argument"
          ) {
            staleTokens.push(batch[index]);
          } else {
            this.logger.warn(
              `FCM delivery failed for one token: ${code ?? "unknown error"}`,
            );
          }
        });
      }

      return { successCount, staleTokens };
    } catch (err) {
      this.logger.error("FCM error (notification skipped)", err);
      return { successCount: 0, staleTokens: [] };
    }
  }
}
