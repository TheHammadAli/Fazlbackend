import { Injectable } from "@nestjs/common";
import { Server } from "socket.io";

export type PresenceChange = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: Date | null;
};

/** In-memory presence tracker: userId -> set of live socket ids across all their connections (tabs/devices). */
@Injectable()
export class PresenceService {
  private readonly userSockets = new Map<string, Set<string>>();

  // Presence is written from more than one gateway, and each gateway is its own
  // Socket.IO namespace with its own rooms — an emit on one is invisible to the
  // other. So every gateway registers its server here and a change fans out to
  // all of them, letting a client watch presence from whichever namespace it is
  // already connected to.
  private readonly servers = new Set<Server>();

  /** Room a socket joins to receive one user's presence changes. */
  static room(userId: string): string {
    return `presence:${userId}`;
  }

  registerServer(server: Server): void {
    if (server) this.servers.add(server);
  }

  /** Tells everyone watching this user that they came online or went offline. */
  broadcastChange(change: PresenceChange): void {
    for (const server of this.servers) {
      server.to(PresenceService.room(change.userId)).emit("presenceChanged", change);
    }
  }

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

  /** All currently online user ids, for filtering a user list down to who's online. */
  getAllOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
