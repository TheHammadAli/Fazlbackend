import { Injectable } from "@nestjs/common";

/** In-memory presence tracker: userId -> set of live socket ids across all their connections (tabs/devices). */
@Injectable()
export class PresenceService {
  private readonly userSockets = new Map<string, Set<string>>();

  /** Returns true if this is the user's first connection (they just went online). */
  addConnection(userId: string, socketId: string): boolean {
    const existing = this.userSockets.get(userId);
    if (!existing) {
      this.userSockets.set(userId, new Set([socketId]));
      return true;
    }
    const wasEmpty = existing.size === 0;
    existing.add(socketId);
    return wasEmpty;
  }

  /** Returns true if this was the user's last connection (they just went offline). */
  removeConnection(userId: string, socketId: string): boolean {
    const existing = this.userSockets.get(userId);
    if (!existing) return false;

    existing.delete(socketId);
    if (existing.size === 0) {
      this.userSockets.delete(userId);
      return true;
    }
    return false;
  }

  isOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /** Bulk check for decorating a whole page of users in one pass. */
  getOnlineUserIds(userIds: string[]): Set<string> {
    return new Set(userIds.filter((id) => this.isOnline(id)));
  }

  /** Total distinct users currently online (not connection count — multiple tabs count once). */
  getOnlineCount(): number {
    return this.userSockets.size;
  }
}
