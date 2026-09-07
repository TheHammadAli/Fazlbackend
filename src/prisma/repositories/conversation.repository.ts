import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

/** One inbox row: the conversation, both participants, its latest message and the viewer's unread count. */
export interface InboxRow {
  _id: string;
  id: string;
  status: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  buyer: InboxParticipant | null;
  seller: InboxParticipant | null;
  latestMessage: InboxLatestMessage | null;
  unreadCount: number;
}

export interface InboxParticipant {
  _id: string;
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  lastSeenAt: Date | null;
}

export interface InboxLatestMessage {
  _id: string;
  id: string;
  text: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  read: boolean;
  createdAt: Date;
  sender: { _id: string; id: string; name: string | null } | null;
}

/**
 * The chat inbox, as raw SQL.
 *
 * This replaces the single largest aggregation in the codebase: a $lookup for
 * the buyer, another for the seller, a third whose sub-pipeline sorted every
 * message in the conversation to take the newest one (with a *fourth* lookup
 * nested inside it for that message's sender), a fifth whose sub-pipeline
 * counted unread messages, then $addFields, $project and a two-key $sort — plus
 * a separate countDocuments.
 *
 * Two LATERAL joins express the "newest message" and "unread count" parts
 * directly, and Postgres can satisfy both from the
 * (conversation_id, created_at DESC) and (receiver_id, read) indexes rather
 * than materialising every message per conversation.
 *
 * Kept in a repository so the SQL is reviewable on its own and no controller
 * ever sees it.
 */
@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findInboxForUser(opts: {
    userId: string;
    skip: number;
    take: number;
  }): Promise<{ rows: InboxRow[]; total: number }> {
    const { userId, skip, take } = opts;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<
        {
          id: string;
          status: string;
          last_message_at: Date | null;
          created_at: Date;
          updated_at: Date;
          buyer_id: string | null;
          buyer_name: string | null;
          buyer_email: string | null;
          buyer_image: string | null;
          buyer_last_seen_at: Date | null;
          seller_id: string | null;
          seller_name: string | null;
          seller_email: string | null;
          seller_image: string | null;
          seller_last_seen_at: Date | null;
          lm_id: string | null;
          lm_text: string | null;
          lm_image_url: string | null;
          lm_audio_url: string | null;
          lm_read: boolean | null;
          lm_created_at: Date | null;
          lm_sender_id: string | null;
          lm_sender_name: string | null;
          unread_count: number;
        }[]
      >`
        SELECT c.id,
               c.status::text        AS status,
               c.last_message_at,
               c.created_at,
               c.updated_at,

               b.id           AS buyer_id,
               b.name         AS buyer_name,
               b.email        AS buyer_email,
               b.image        AS buyer_image,
               b.last_seen_at AS buyer_last_seen_at,

               s.id           AS seller_id,
               s.name         AS seller_name,
               s.email        AS seller_email,
               s.image        AS seller_image,
               s.last_seen_at AS seller_last_seen_at,

               lm.id         AS lm_id,
               lm.text       AS lm_text,
               lm.image_url  AS lm_image_url,
               lm.audio_url  AS lm_audio_url,
               lm.read       AS lm_read,
               lm.created_at AS lm_created_at,
               lms.id        AS lm_sender_id,
               lms.name      AS lm_sender_name,

               COALESCE(uc.count, 0)::int AS unread_count

        FROM conversations c
        LEFT JOIN users b ON b.id = c.buyer_id
        LEFT JOIN users s ON s.id = c.seller_id

        -- newest message in the conversation
        LEFT JOIN LATERAL (
          SELECT m.id, m.text, m.image_url, m.audio_url, m.read, m.created_at, m.sender_id
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) lm ON TRUE
        LEFT JOIN users lms ON lms.id = lm.sender_id

        -- unread messages addressed to this viewer
        LEFT JOIN LATERAL (
          SELECT count(*) AS count
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.receiver_id = ${userId}
            AND m.read = false
            AND m.sender_id <> ${userId}
        ) uc ON TRUE

        WHERE c.buyer_id = ${userId} OR c.seller_id = ${userId}
        -- NULLS LAST keeps a brand-new conversation with no messages from
        -- sorting above active ones, which is what Mongo's missing-field
        -- ordering did here.
        ORDER BY lm.created_at DESC NULLS LAST, c.last_message_at DESC NULLS LAST
        LIMIT ${take} OFFSET ${skip}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*)::bigint AS total
        FROM conversations c
        WHERE c.buyer_id = ${userId} OR c.seller_id = ${userId}
      `,
    ]);

    const participant = (
      id: string | null,
      name: string | null,
      email: string | null,
      image: string | null,
      lastSeenAt: Date | null,
    ): InboxParticipant | null =>
      id ? { _id: id, id, name, email: email as string, image, lastSeenAt } : null;

    return {
      rows: rows.map((r) => ({
        _id: r.id,
        id: r.id,
        status: r.status,
        lastMessageAt: r.last_message_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        buyer: participant(
          r.buyer_id,
          r.buyer_name,
          r.buyer_email,
          r.buyer_image,
          r.buyer_last_seen_at,
        ),
        seller: participant(
          r.seller_id,
          r.seller_name,
          r.seller_email,
          r.seller_image,
          r.seller_last_seen_at,
        ),
        latestMessage: r.lm_id
          ? {
              _id: r.lm_id,
              id: r.lm_id,
              text: r.lm_text,
              imageUrl: r.lm_image_url,
              audioUrl: r.lm_audio_url,
              read: r.lm_read as boolean,
              createdAt: r.lm_created_at as Date,
              sender: r.lm_sender_id
                ? { _id: r.lm_sender_id, id: r.lm_sender_id, name: r.lm_sender_name }
                : null,
            }
          : null,
        unreadCount: Number(r.unread_count),
      })),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  /**
   * Flips a user's pending messages to "delivered" and returns exactly the rows
   * that changed.
   *
   * UPDATE ... RETURNING closes a race the Mongoose version had: it selected
   * the pending messages, then updated them in a second statement, so a
   * concurrent markAsRead between the two could leave the service emitting
   * "delivered" for a message that had already been read. Here the filter and
   * the write are one statement, and only genuinely-transitioned rows come back.
   */
  async markDeliveredForUser(
    userId: string,
    deliveredAt: Date,
  ): Promise<{ id: string; conversationId: string; senderId: string }[]> {
    const rows = await this.prisma.$queryRaw<
      { id: string; conversation_id: string; sender_id: string }[]
    >`
      UPDATE messages
      SET status = 'delivered', delivered_at = ${deliveredAt}
      WHERE receiver_id = ${userId} AND status = 'sent'
      RETURNING id, conversation_id, sender_id
    `;
    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
    }));
  }

  /** Same, for a specific set of message ids (the send-time fast path). */
  async markDeliveredByIds(
    messageIds: string[],
    deliveredAt: Date,
  ): Promise<{ id: string; conversationId: string; senderId: string }[]> {
    if (messageIds.length === 0) return [];

    const rows = await this.prisma.$queryRaw<
      { id: string; conversation_id: string; sender_id: string }[]
    >`
      UPDATE messages
      SET status = 'delivered', delivered_at = ${deliveredAt}
      WHERE id = ANY(${messageIds}) AND status = 'sent'
      RETURNING id, conversation_id, sender_id
    `;
    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
    }));
  }
}
