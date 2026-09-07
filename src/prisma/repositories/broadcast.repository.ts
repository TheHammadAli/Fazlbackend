import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Prisma } from "../../../generated/prisma/client";

/** Newest message in a thread, with its sender. */
export interface LatestThreadMessage {
  threadId: string;
  _id: string;
  id: string;
  message: string | null;
  imageUrls: string[];
  audioUrl: string | null;
  createdAt: Date;
  sender: { _id: string; id: string; name: string | null; image: string | null } | null;
}

/** One row of the admin Broadcasts list. */
export interface AdminBroadcastRow {
  _id: string;
  id: string;
  broadcastCode: string | null;
  message: string;
  purpose: string;
  type: string;
  status: string;
  createdAt: Date;
  sentTo: number;
  repliedSellers: number;
  buyerInfo: { _id: string; id: string; name: string | null } | null;
}

/**
 * The broadcast queries that do not map cleanly onto the typed client.
 *
 * Each replaces a sub-pipeline $lookup that Mongo used to fetch "the newest
 * row per group" or "a count per group" — patterns Postgres expresses directly
 * with DISTINCT ON and GROUP BY, and which would otherwise become an N+1.
 */
@Injectable()
export class BroadcastRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The newest message in each of the given threads, in one query.
   *
   * DISTINCT ON is the Postgres idiom for "greatest row per group"; the Mongo
   * version ran a sorted, limited sub-pipeline per thread.
   */
  async latestMessagePerThread(threadIds: string[]): Promise<Map<string, LatestThreadMessage>> {
    if (threadIds.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<
      {
        thread_id: string;
        id: string;
        message: string | null;
        image_urls: string[];
        audio_url: string | null;
        created_at: Date;
        sender_id: string | null;
        sender_name: string | null;
        sender_image: string | null;
      }[]
    >`
      SELECT DISTINCT ON (m.thread_id)
             m.thread_id,
             m.id,
             m.message,
             m.image_urls,
             m.audio_url,
             m.created_at,
             u.id    AS sender_id,
             u.name  AS sender_name,
             u.image AS sender_image
      FROM broadcast_messages m
      LEFT JOIN users u ON u.id = m.sender_id
      WHERE m.thread_id = ANY(${threadIds})
      ORDER BY m.thread_id, m.created_at DESC
    `;

    return new Map(
      rows.map((r) => [
        r.thread_id,
        {
          threadId: r.thread_id,
          _id: r.id,
          id: r.id,
          message: r.message,
          imageUrls: r.image_urls ?? [],
          audioUrl: r.audio_url,
          createdAt: r.created_at,
          sender: r.sender_id
            ? {
                _id: r.sender_id,
                id: r.sender_id,
                name: r.sender_name,
                image: r.sender_image,
              }
            : null,
        },
      ]),
    );
  }

  /** Unread messages addressed to `userId`, counted per thread, in one query. */
  async unreadCountPerThread(
    threadIds: string[],
    userId: string,
  ): Promise<Map<string, number>> {
    if (threadIds.length === 0) return new Map();

    const rows = await this.prisma.broadcastMessage.groupBy({
      by: ["threadId"],
      where: {
        threadId: { in: threadIds },
        receiverId: userId,
        isRead: false,
        senderId: { not: userId },
      },
      _count: { _all: true },
    });

    return new Map(rows.map((r) => [r.threadId, r._count._all]));
  }

  /** The first reply from each thread's seller, keyed by thread. */
  async firstSellerReplyPerThread(
    threadIds: string[],
  ): Promise<Map<string, Date>> {
    if (threadIds.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<
      { thread_id: string; created_at: Date }[]
    >`
      SELECT DISTINCT ON (m.thread_id) m.thread_id, m.created_at
      FROM broadcast_messages m
      JOIN broadcast_threads t ON t.id = m.thread_id
      WHERE m.thread_id = ANY(${threadIds})
        AND m.sender_id = t.seller_id
      ORDER BY m.thread_id, m.created_at ASC
    `;

    return new Map(rows.map((r) => [r.thread_id, r.created_at]));
  }

  /**
   * The admin Broadcasts list.
   *
   * `sentTo` counts this broadcast's threads and `repliedSellers` counts the
   * distinct non-buyer senders — the pipeline did both by $lookup-ing every
   * thread and every message into memory and taking $size/$setUnion of them.
   */
  async findForAdmin(opts: {
    skip: number;
    take: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ rows: AdminBroadcastRow[]; total: number }> {
    const clauses: Prisma.Sql[] = [Prisma.sql`b.is_deleted = false`];

    if (opts.status?.trim()) {
      clauses.push(Prisma.sql`b.status::text = ${opts.status.trim().toLowerCase()}`);
    }
    if (opts.startDate) {
      clauses.push(Prisma.sql`b.created_at >= ${new Date(opts.startDate)}`);
    }
    if (opts.endDate) {
      const endOfDay = new Date(opts.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      clauses.push(Prisma.sql`b.created_at <= ${endOfDay}`);
    }

    const search = opts.search?.trim();
    if (search) {
      const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
      clauses.push(Prisma.sql`(b.message ILIKE ${pattern} OR u.name ILIKE ${pattern})`);
    }

    const where = Prisma.join(clauses, " AND ");
    const joins = Prisma.sql`LEFT JOIN users u ON u.id = b.buyer_id`;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          broadcast_code: string | null;
          message: string;
          purpose: string;
          type: string;
          status: string;
          created_at: Date;
          sent_to: number;
          replied_sellers: number;
          buyer_id: string | null;
          buyer_name: string | null;
        }[]
      >`
        SELECT b.id,
               b.broadcast_code,
               b.message,
               b.purpose::text AS purpose,
               b.type::text    AS type,
               b.status::text  AS status,
               b.created_at,
               (SELECT count(*) FROM broadcast_threads t WHERE t.broadcast_id = b.id)::int
                 AS sent_to,
               (SELECT count(DISTINCT m.sender_id)
                  FROM broadcast_messages m
                 WHERE m.broadcast_id = b.id AND m.sender_id <> b.buyer_id)::int
                 AS replied_sellers,
               u.id   AS buyer_id,
               u.name AS buyer_name
        FROM broadcasts b
        ${joins}
        WHERE ${where}
        ORDER BY b.created_at DESC
        LIMIT ${opts.take} OFFSET ${opts.skip}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*)::bigint AS total
        FROM broadcasts b
        ${joins}
        WHERE ${where}
      `,
    ]);

    return {
      rows: rows.map((r) => ({
        _id: r.id,
        id: r.id,
        broadcastCode: r.broadcast_code,
        message: r.message,
        purpose: r.purpose,
        type: r.type,
        status: r.status,
        createdAt: r.created_at,
        sentTo: Number(r.sent_to),
        repliedSellers: Number(r.replied_sellers),
        buyerInfo: r.buyer_id
          ? { _id: r.buyer_id, id: r.buyer_id, name: r.buyer_name }
          : null,
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
