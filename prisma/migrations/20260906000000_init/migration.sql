-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('buyer', 'seller', 'admin', 'subadmin', 'super_admin', 'moderator');

-- CreateEnum
CREATE TYPE "AdminPermissionPage" AS ENUM ('users', 'shops', 'listings', 'services', 'categories', 'bookings', 'broadcasts', 'announcements', 'feed', 'reports', 'email-logs', 'settings', 'members', 'wallet', 'reviews');

-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('view', 'edit', 'delete');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('service', 'product');

-- CreateEnum
CREATE TYPE "CategoryRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('retail', 'classified');

-- CreateEnum
CREATE TYPE "ServicePaymentType" AS ENUM ('hourly', 'fixed', 'call_for_price');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'verified', 'disputed');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'proposed', 'cancelled', 'confirmed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "OrderPaymentType" AS ENUM ('cashonDelivery', 'Easypaisa');

-- CreateEnum
CREATE TYPE "DeliveryOption" AS ENUM ('self-pickup', 'delivery');

-- CreateEnum
CREATE TYPE "OwnerModel" AS ENUM ('Shop', 'User');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('product', 'service');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('sent', 'delivered', 'read');

-- CreateEnum
CREATE TYPE "ProductOfferStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- CreateEnum
CREATE TYPE "BroadcastOfferStatus" AS ENUM ('pending', 'accepted', 'declined');

-- CreateEnum
CREATE TYPE "BroadcastPurpose" AS ENUM ('Buying', 'Selling');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "ReportEntityType" AS ENUM ('shop', 'product', 'service', 'user');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('Spam', 'Adult Content', 'Fraud', 'Duplicate', 'Other');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER', 'MESSAGE', 'PROMOTION', 'SERVICE_REQUEST', 'BROADCAST', 'ANNOUNCEMENT', 'LIKE', 'REPORT', 'PRODUCT_OFFER');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('draft', 'scheduled', 'sent');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'submitted', 'revision', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PromotionTargetType" AS ENUM ('Product', 'Shop', 'Service');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('active', 'expired', 'cancelled', 'scheduled');

-- CreateEnum
CREATE TYPE "SubscriptionTargetType" AS ENUM ('Product', 'Shop');

-- CreateEnum
CREATE TYPE "SubscriptionScreenType" AS ENUM ('listing', 'feed');

-- CreateEnum
CREATE TYPE "ActivityLogAction" AS ENUM ('admin_login', 'admin_logout', 'user_suspended', 'user_enabled', 'user_updated', 'shop_suspended', 'shop_enabled', 'listing_suspended', 'listing_enabled', 'listing_deleted', 'broadcast_deleted', 'member_created', 'member_updated', 'member_deleted', 'member_password_reset', 'task_created', 'task_assigned', 'task_updated', 'task_deleted', 'task_submitted', 'task_reviewed', 'admin_password_reset');

-- CreateEnum
CREATE TYPE "ActivityLogTargetType" AS ENUM ('User', 'Shop', 'Product', 'Broadcast', 'Task');

-- CreateEnum
CREATE TYPE "EmailLogEvent" AS ENUM ('shop_created', 'listing_created', 'service_created', 'booking_accepted', 'broadcast_created');

-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('sent', 'failed');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('user', 'merchant');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('order_payment', 'manual_credit', 'manual_debit', 'withdrawal_debit', 'refund_credit');

-- CreateEnum
CREATE TYPE "WalletPaymentMethod" AS ENUM ('fazl_wallet', 'cash');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('pending', 'completed', 'failed', 'reversed');

-- CreateEnum
CREATE TYPE "WalletTransactionRefundStatus" AS ENUM ('none', 'partial', 'full');

-- CreateEnum
CREATE TYPE "WalletRefModel" AS ENUM ('User', 'Wallet');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "LedgerBalanceType" AS ENUM ('available', 'pending');

-- CreateEnum
CREATE TYPE "LedgerRelatedEntityType" AS ENUM ('WalletTransaction', 'Withdrawal', 'Refund', 'ManualAdjustment');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "WithdrawalMethod" AS ENUM ('bank_transfer', 'jazzcash', 'easypaisa', 'other');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "WalletAuditAction" AS ENUM ('manual_balance_addition', 'manual_balance_deduction', 'wallet_freeze', 'wallet_unfreeze', 'refund', 'refund_rejection', 'withdrawal_created', 'withdrawal_approval', 'withdrawal_rejection', 'withdrawal_status_change', 'withdrawal_cancelled', 'deal_change', 'wallet_settings_change', 'wallet_recalculated');

-- CreateEnum
CREATE TYPE "WalletAuditTargetType" AS ENUM ('Wallet', 'WalletTransaction', 'Withdrawal', 'Refund', 'MerchantDeal', 'WalletSettings');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(24) NOT NULL,
    "user_code" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "member_password" TEXT,
    "roles" "UserRole"[],
    "phone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "image" TEXT DEFAULT 'default-avatar.png',
    "address" TEXT,
    "refresh_token" TEXT,
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMPTZ(3),
    "provider" TEXT,
    "fcm_token" TEXT,
    "fcm_tokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "page" "AdminPermissionPage" NOT NULL,
    "actions" "AdminAction"[] DEFAULT ARRAY[]::"AdminAction"[],

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" VARCHAR(24) NOT NULL,
    "phone_number" TEXT,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'phone',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3),

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "name" JSONB NOT NULL,
    "description" JSONB,
    "id" VARCHAR(24) NOT NULL,
    "parameters" JSONB DEFAULT '{"en":[],"ur":[]}',
    "sort_number" INTEGER NOT NULL DEFAULT 0,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "type" "CategoryType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_requests" (
    "id" VARCHAR(24) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requested_by" VARCHAR(24) NOT NULL,
    "status" "CategoryRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" VARCHAR(24),
    "admin_comment" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(3),

    CONSTRAINT "category_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" VARCHAR(24) NOT NULL,
    "shop_code" TEXT,
    "owner_id" VARCHAR(24) NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "banner" TEXT,
    "address" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" VARCHAR(24) NOT NULL,
    "subcategory_id" VARCHAR(24),
    "market_name" TEXT,
    "area" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "opening_hours" TEXT,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" VARCHAR(24) NOT NULL,
    "listing_code" TEXT,
    "video_code" TEXT,
    "shop_id" VARCHAR(24),
    "owner_id" VARCHAR(24),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "type" "ProductType" NOT NULL,
    "category_id" VARCHAR(24) NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "parameters" JSONB DEFAULT '[]',
    "searchable_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_video_post" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" VARCHAR(24) NOT NULL,
    "service_code" TEXT,
    "owner_id" VARCHAR(24) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER,
    "payment_type" "ServicePaymentType" NOT NULL DEFAULT 'fixed',
    "requires_appointment" BOOLEAN NOT NULL DEFAULT true,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video" TEXT,
    "category_id" VARCHAR(24) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "parameters" JSONB DEFAULT '[]',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" VARCHAR(24) NOT NULL,
    "buyer_id" VARCHAR(24) NOT NULL,
    "owner_model" "OwnerModel" NOT NULL,
    "shop_owner_id" VARCHAR(24),
    "user_owner_id" VARCHAR(24),
    "product_id" VARCHAR(24) NOT NULL,
    "delivery_option" "DeliveryOption" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "payment_type" "OrderPaymentType" NOT NULL DEFAULT 'cashonDelivery',
    "amount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "variant" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_offers" (
    "id" VARCHAR(24) NOT NULL,
    "product_id" VARCHAR(24) NOT NULL,
    "offerer_id" VARCHAR(24) NOT NULL,
    "seller_id" VARCHAR(24) NOT NULL,
    "price" INTEGER,
    "message" VARCHAR(1000) NOT NULL,
    "status" "ProductOfferStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" VARCHAR(24) NOT NULL,
    "job_code" TEXT,
    "service_id" VARCHAR(24) NOT NULL,
    "customer_id" VARCHAR(24) NOT NULL,
    "provider_id" VARCHAR(24) NOT NULL,
    "requested_date_time" TIMESTAMPTZ(3) NOT NULL,
    "proposed_date_time" TIMESTAMPTZ(3),
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'pending',
    "job_status" "JobStatus" NOT NULL DEFAULT 'not_started',
    "message" TEXT,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" VARCHAR(24) NOT NULL,
    "target_type" "SubscriptionTargetType" NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "duration_in_days" INTEGER NOT NULL,
    "screen_type" "SubscriptionScreenType" DEFAULT 'listing',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" VARCHAR(24) NOT NULL,
    "subscription_id" VARCHAR(24) NOT NULL,
    "target_type" "PromotionTargetType" NOT NULL,
    "product_id" VARCHAR(24),
    "shop_id" VARCHAR(24),
    "service_id" VARCHAR(24),
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "end_date" TIMESTAMPTZ(3) NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'active',
    "is_auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "is_in_feed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" VARCHAR(24) NOT NULL,
    "buyer_id" VARCHAR(24) NOT NULL,
    "seller_id" VARCHAR(24) NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'open',
    "last_message_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" VARCHAR(24) NOT NULL,
    "conversation_id" VARCHAR(24) NOT NULL,
    "sender_id" VARCHAR(24) NOT NULL,
    "receiver_id" VARCHAR(24) NOT NULL,
    "text" TEXT,
    "sender_text" TEXT,
    "image_url" TEXT,
    "audio_url" TEXT,
    "audio_duration" INTEGER,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "status" "MessageStatus" NOT NULL DEFAULT 'sent',
    "delivered_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" VARCHAR(24) NOT NULL,
    "broadcast_code" TEXT,
    "buyer_id" VARCHAR(24) NOT NULL,
    "message" TEXT NOT NULL,
    "address" TEXT,
    "purpose" "BroadcastPurpose" NOT NULL,
    "category_id" VARCHAR(24),
    "radius" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "type" "ItemType" NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "last_response_at" TIMESTAMPTZ(3),
    "status" "BroadcastStatus" NOT NULL DEFAULT 'open',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_threads" (
    "id" VARCHAR(24) NOT NULL,
    "broadcast_id" VARCHAR(24) NOT NULL,
    "buyer_id" VARCHAR(24) NOT NULL,
    "seller_id" VARCHAR(24) NOT NULL,
    "last_message_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "broadcast_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_messages" (
    "id" VARCHAR(24) NOT NULL,
    "broadcast_id" VARCHAR(24) NOT NULL,
    "thread_id" VARCHAR(24) NOT NULL,
    "sender_id" VARCHAR(24) NOT NULL,
    "receiver_id" VARCHAR(24) NOT NULL,
    "message" TEXT,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audio_url" TEXT,
    "audio_duration" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "broadcast_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_offers" (
    "id" VARCHAR(24) NOT NULL,
    "broadcast_id" VARCHAR(24) NOT NULL,
    "thread_id" VARCHAR(24) NOT NULL,
    "offerer_id" VARCHAR(24) NOT NULL,
    "creator_id" VARCHAR(24) NOT NULL,
    "price" INTEGER,
    "message" VARCHAR(1000) NOT NULL,
    "status" "BroadcastOfferStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "broadcast_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "item_id" VARCHAR(24) NOT NULL,
    "item_type" "ItemType" NOT NULL,
    "owner_model" "OwnerModel" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "item_id" VARCHAR(24) NOT NULL,
    "item_type" "ItemType" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "item_id" VARCHAR(24) NOT NULL,
    "item_type" "ItemType" NOT NULL,
    "request_id" VARCHAR(24),
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" VARCHAR(24) NOT NULL,
    "report_code" TEXT,
    "reporter_id" VARCHAR(24) NOT NULL,
    "entity_id" VARCHAR(24) NOT NULL,
    "entity_type" "ReportEntityType" NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" VARCHAR(1000) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "content_removed" BOOLEAN NOT NULL DEFAULT false,
    "closed_by" VARCHAR(24),
    "closed_at" TIMESTAMPTZ(3),
    "admin_response" VARCHAR(1000),
    "responded_by" VARCHAR(24),
    "responded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "payload" JSONB DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" VARCHAR(24) NOT NULL,
    "announcement_code" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "image" TEXT,
    "video" TEXT,
    "target_audience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" VARCHAR(24),
    "location" TEXT,
    "cta_label" TEXT,
    "cta_destination" TEXT,
    "scheduled_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "priority" "AnnouncementPriority" DEFAULT 'medium',
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMPTZ(3),
    "created_by" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" VARCHAR(24) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMPTZ(3),
    "created_by" VARCHAR(24) NOT NULL,
    "attachments" JSONB DEFAULT '[]',
    "revision_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignees" (
    "task_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("task_id","user_id")
);

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" TEXT NOT NULL,
    "task_id" VARCHAR(24) NOT NULL,
    "notes" TEXT NOT NULL,
    "link" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "submitted_by" VARCHAR(24) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" VARCHAR(24) NOT NULL,
    "log_code" INTEGER NOT NULL,
    "actor_id" VARCHAR(24) NOT NULL,
    "action" "ActivityLogAction" NOT NULL,
    "target_type" "ActivityLogTargetType",
    "target_id" VARCHAR(24),
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" VARCHAR(24) NOT NULL,
    "email_id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "related_record_id" TEXT,
    "event_type" "EmailLogEvent" NOT NULL,
    "delivery_status" "EmailLogStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" VARCHAR(64) NOT NULL,
    "facebook_url" TEXT,
    "twitter_url" TEXT,
    "threads_url" TEXT,
    "linkedin_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "id" VARCHAR(64) NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_views" (
    "id" VARCHAR(24) NOT NULL,
    "product_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_contact_clicks" (
    "id" VARCHAR(24) NOT NULL,
    "product_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_contact_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_whatsapp_clicks" (
    "id" VARCHAR(24) NOT NULL,
    "product_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_whatsapp_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_views" (
    "id" VARCHAR(24) NOT NULL,
    "service_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_contact_clicks" (
    "id" VARCHAR(24) NOT NULL,
    "service_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_contact_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_whatsapp_clicks" (
    "id" VARCHAR(24) NOT NULL,
    "service_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_whatsapp_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_views" (
    "id" VARCHAR(24) NOT NULL,
    "shop_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_product_views" (
    "id" VARCHAR(24) NOT NULL,
    "shop_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_contact_clicks" (
    "id" VARCHAR(24) NOT NULL,
    "shop_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_contact_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_whatsapp_clicks" (
    "id" VARCHAR(24) NOT NULL,
    "shop_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shop_whatsapp_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_views" (
    "id" VARCHAR(24) NOT NULL,
    "announcement_id" VARCHAR(24) NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "announcement_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" VARCHAR(24) NOT NULL,
    "wallet_code" TEXT,
    "owner_id" VARCHAR(24) NOT NULL,
    "wallet_type" "WalletType" NOT NULL,
    "available_balance_minor" INTEGER NOT NULL DEFAULT 0,
    "pending_balance_minor" INTEGER NOT NULL DEFAULT 0,
    "total_received_minor" INTEGER NOT NULL DEFAULT 0,
    "total_withdrawn_minor" INTEGER NOT NULL DEFAULT 0,
    "is_frozen" BOOLEAN NOT NULL DEFAULT false,
    "frozen_reason" TEXT,
    "frozen_at" TIMESTAMPTZ(3),
    "frozen_by" VARCHAR(24),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" VARCHAR(24) NOT NULL,
    "transaction_code" TEXT,
    "type" "WalletTransactionType" NOT NULL,
    "user_id" VARCHAR(24) NOT NULL,
    "merchant_id" VARCHAR(24),
    "order_id" VARCHAR(24),
    "original_amount_minor" INTEGER NOT NULL DEFAULT 0,
    "customer_discount_percent" INTEGER NOT NULL DEFAULT 0,
    "customer_discount_amount_minor" INTEGER NOT NULL DEFAULT 0,
    "final_customer_payment_minor" INTEGER NOT NULL DEFAULT 0,
    "merchant_deal_percent" INTEGER NOT NULL DEFAULT 0,
    "fazl_margin_percent" INTEGER NOT NULL DEFAULT 0,
    "fazl_margin_amount_minor" INTEGER NOT NULL DEFAULT 0,
    "merchant_settlement_amount_minor" INTEGER NOT NULL DEFAULT 0,
    "deal_snapshot_id" VARCHAR(24),
    "payment_method" "WalletPaymentMethod" NOT NULL,
    "sender_ref_type" "WalletRefModel",
    "sender_ref_id" VARCHAR(24),
    "receiver_ref_type" "WalletRefModel",
    "receiver_ref_id" VARCHAR(24),
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'completed',
    "refund_status" "WalletTransactionRefundStatus" NOT NULL DEFAULT 'none',
    "reason" TEXT,
    "created_by" VARCHAR(24),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger_entries" (
    "id" VARCHAR(24) NOT NULL,
    "ledger_code" TEXT,
    "wallet_id" VARCHAR(24) NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "balance_type" "LedgerBalanceType" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "opening_balance_minor" INTEGER NOT NULL,
    "closing_balance_minor" INTEGER NOT NULL,
    "related_transaction_id" VARCHAR(24),
    "related_entity_type" "LedgerRelatedEntityType" NOT NULL,
    "related_entity_id" VARCHAR(24),
    "reason" TEXT,
    "created_by" VARCHAR(24),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" VARCHAR(24) NOT NULL,
    "withdrawal_code" TEXT,
    "merchant_id" VARCHAR(24) NOT NULL,
    "wallet_id" VARCHAR(24) NOT NULL,
    "requested_amount_minor" INTEGER NOT NULL,
    "available_balance_snapshot_minor" INTEGER NOT NULL,
    "withdrawal_method" "WithdrawalMethod" NOT NULL,
    "account_title" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" TEXT,
    "iban" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
    "processing_date" TIMESTAMPTZ(3),
    "completed_date" TIMESTAMPTZ(3),
    "transaction_id" VARCHAR(24),
    "platform_fee_percent" INTEGER NOT NULL DEFAULT 0,
    "external_fee_amount_minor" INTEGER,
    "external_fee_note" TEXT,
    "rejection_reason" TEXT,
    "cancellation_reason" TEXT,
    "created_by" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" VARCHAR(24) NOT NULL,
    "refund_code" TEXT,
    "original_transaction_id" VARCHAR(24) NOT NULL,
    "order_id" VARCHAR(24),
    "customer_id" VARCHAR(24) NOT NULL,
    "merchant_id" VARCHAR(24),
    "refund_amount_minor" INTEGER NOT NULL,
    "refund_reason" TEXT NOT NULL,
    "refund_status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_by" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_deals" (
    "id" VARCHAR(24) NOT NULL,
    "merchant_id" VARCHAR(24) NOT NULL,
    "customer_discount_percent" INTEGER NOT NULL,
    "fazl_margin_percent" INTEGER NOT NULL,
    "merchant_deal_percent" INTEGER NOT NULL,
    "effective_from" TIMESTAMPTZ(3) NOT NULL,
    "effective_to" TIMESTAMPTZ(3),
    "created_by" VARCHAR(24) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "merchant_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_settings" (
    "id" VARCHAR(64) NOT NULL,
    "min_top_up_amount_minor" INTEGER NOT NULL DEFAULT 10000,
    "max_top_up_amount_minor" INTEGER NOT NULL DEFAULT 100000000,
    "min_withdrawal_amount_minor" INTEGER NOT NULL DEFAULT 50000,
    "max_withdrawal_amount_minor" INTEGER NOT NULL DEFAULT 100000000,
    "daily_transaction_limit_minor" INTEGER NOT NULL DEFAULT 500000000,
    "wallet_status" BOOLEAN NOT NULL DEFAULT true,
    "withdrawal_status" BOOLEAN NOT NULL DEFAULT true,
    "updated_by" VARCHAR(24),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "wallet_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_audit_logs" (
    "id" VARCHAR(24) NOT NULL,
    "log_code" TEXT,
    "admin_id" VARCHAR(24) NOT NULL,
    "action" "WalletAuditAction" NOT NULL,
    "target_type" "WalletAuditTargetType" NOT NULL,
    "target_id" VARCHAR(64) NOT NULL,
    "subject_user_id" VARCHAR(24),
    "transaction_id" VARCHAR(24),
    "old_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_user_code_key" ON "users"("user_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_disabled_idx" ON "users"("is_disabled");

-- CreateIndex
CREATE INDEX "user_permissions_user_id_idx" ON "user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_user_id_page_key" ON "user_permissions"("user_id", "page");

-- CreateIndex
CREATE INDEX "otps_email_idx" ON "otps"("email");

-- CreateIndex
CREATE INDEX "otps_phone_number_idx" ON "otps"("phone_number");

-- CreateIndex
CREATE INDEX "otps_expires_at_idx" ON "otps"("expires_at");

-- CreateIndex
CREATE INDEX "categories_type_is_disabled_idx" ON "categories"("type", "is_disabled");

-- CreateIndex
CREATE INDEX "categories_sort_number_idx" ON "categories"("sort_number");

-- CreateIndex
CREATE INDEX "category_requests_status_idx" ON "category_requests"("status");

-- CreateIndex
CREATE INDEX "category_requests_requested_by_idx" ON "category_requests"("requested_by");

-- CreateIndex
CREATE UNIQUE INDEX "shops_shop_code_key" ON "shops"("shop_code");

-- CreateIndex
CREATE INDEX "shops_owner_id_idx" ON "shops"("owner_id");

-- CreateIndex
CREATE INDEX "shops_category_id_idx" ON "shops"("category_id");

-- CreateIndex
CREATE INDEX "shops_city_area_idx" ON "shops"("city", "area");

-- CreateIndex
CREATE INDEX "shops_is_disabled_idx" ON "shops"("is_disabled");

-- CreateIndex
CREATE UNIQUE INDEX "products_listing_code_key" ON "products"("listing_code");

-- CreateIndex
CREATE UNIQUE INDEX "products_video_code_key" ON "products"("video_code");

-- CreateIndex
CREATE INDEX "products_shop_id_is_video_post_is_deleted_is_disabled_idx" ON "products"("shop_id", "is_video_post", "is_deleted", "is_disabled");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_owner_id_idx" ON "products"("owner_id");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at" DESC);

-- CreateIndex
CREATE INDEX "products_searchable_tags_idx" ON "products" USING GIN ("searchable_tags");

-- CreateIndex
CREATE UNIQUE INDEX "services_service_code_key" ON "services"("service_code");

-- CreateIndex
CREATE INDEX "services_owner_id_idx" ON "services"("owner_id");

-- CreateIndex
CREATE INDEX "services_category_id_idx" ON "services"("category_id");

-- CreateIndex
CREATE INDEX "services_is_deleted_is_disabled_idx" ON "services"("is_deleted", "is_disabled");

-- CreateIndex
CREATE INDEX "services_created_at_idx" ON "services"("created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_buyer_id_created_at_idx" ON "orders"("buyer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_shop_owner_id_idx" ON "orders"("shop_owner_id");

-- CreateIndex
CREATE INDEX "orders_user_owner_id_idx" ON "orders"("user_owner_id");

-- CreateIndex
CREATE INDEX "orders_product_id_idx" ON "orders"("product_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "product_offers_product_id_offerer_id_idx" ON "product_offers"("product_id", "offerer_id");

-- CreateIndex
CREATE INDEX "product_offers_seller_id_status_updated_at_idx" ON "product_offers"("seller_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "product_offers_offerer_id_updated_at_idx" ON "product_offers"("offerer_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "product_offers_status_created_at_idx" ON "product_offers"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_job_code_key" ON "service_requests"("job_code");

-- CreateIndex
CREATE INDEX "service_requests_customer_id_created_at_idx" ON "service_requests"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "service_requests_provider_id_created_at_idx" ON "service_requests"("provider_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "service_requests_service_id_idx" ON "service_requests"("service_id");

-- CreateIndex
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");

-- CreateIndex
CREATE INDEX "promotions_target_type_status_idx" ON "promotions"("target_type", "status");

-- CreateIndex
CREATE INDEX "promotions_product_id_idx" ON "promotions"("product_id");

-- CreateIndex
CREATE INDEX "promotions_shop_id_idx" ON "promotions"("shop_id");

-- CreateIndex
CREATE INDEX "promotions_service_id_idx" ON "promotions"("service_id");

-- CreateIndex
CREATE INDEX "promotions_status_end_date_idx" ON "promotions"("status", "end_date");

-- CreateIndex
CREATE INDEX "conversations_buyer_id_last_message_at_idx" ON "conversations"("buyer_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "conversations_seller_id_last_message_at_idx" ON "conversations"("seller_id", "last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_buyer_id_seller_id_key" ON "conversations"("buyer_id", "seller_id");

-- CreateIndex
CREATE INDEX "messages_receiver_id_status_idx" ON "messages"("receiver_id", "status");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_receiver_id_read_idx" ON "messages"("receiver_id", "read");

-- CreateIndex
CREATE UNIQUE INDEX "broadcasts_broadcast_code_key" ON "broadcasts"("broadcast_code");

-- CreateIndex
CREATE INDEX "broadcasts_buyer_id_created_at_idx" ON "broadcasts"("buyer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "broadcasts_status_is_deleted_idx" ON "broadcasts"("status", "is_deleted");

-- CreateIndex
CREATE INDEX "broadcast_threads_buyer_id_idx" ON "broadcast_threads"("buyer_id");

-- CreateIndex
CREATE INDEX "broadcast_threads_seller_id_idx" ON "broadcast_threads"("seller_id");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_threads_broadcast_id_seller_id_key" ON "broadcast_threads"("broadcast_id", "seller_id");

-- CreateIndex
CREATE INDEX "broadcast_messages_thread_id_created_at_idx" ON "broadcast_messages"("thread_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "broadcast_messages_receiver_id_is_read_idx" ON "broadcast_messages"("receiver_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_offers_thread_id_key" ON "broadcast_offers"("thread_id");

-- CreateIndex
CREATE INDEX "broadcast_offers_creator_id_status_updated_at_idx" ON "broadcast_offers"("creator_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "likes_item_id_item_type_idx" ON "likes"("item_id", "item_type");

-- CreateIndex
CREATE UNIQUE INDEX "likes_user_id_item_id_item_type_key" ON "likes"("user_id", "item_id", "item_type");

-- CreateIndex
CREATE INDEX "shares_item_id_item_type_idx" ON "shares"("item_id", "item_type");

-- CreateIndex
CREATE UNIQUE INDEX "shares_user_id_item_id_item_type_key" ON "shares"("user_id", "item_id", "item_type");

-- CreateIndex
CREATE INDEX "reviews_item_id_item_type_idx" ON "reviews"("item_id", "item_type");

-- CreateIndex
CREATE INDEX "reviews_user_id_idx" ON "reviews"("user_id");

-- CreateIndex
CREATE INDEX "reviews_request_id_idx" ON "reviews"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_report_code_key" ON "reports"("report_code");

-- CreateIndex
CREATE INDEX "reports_reporter_id_created_at_idx" ON "reports"("reporter_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reports_entity_id_entity_type_idx" ON "reports"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_created_at_idx" ON "notifications"("user_id", "read", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "announcements_announcement_code_key" ON "announcements"("announcement_code");

-- CreateIndex
CREATE INDEX "announcements_status_scheduled_at_idx" ON "announcements"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "announcements_created_by_idx" ON "announcements"("created_by");

-- CreateIndex
CREATE INDEX "tasks_status_due_date_idx" ON "tasks"("status", "due_date");

-- CreateIndex
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");

-- CreateIndex
CREATE INDEX "task_assignees_user_id_idx" ON "task_assignees"("user_id");

-- CreateIndex
CREATE INDEX "task_submissions_task_id_submitted_at_idx" ON "task_submissions"("task_id", "submitted_at");

-- CreateIndex
CREATE INDEX "activity_logs_actor_id_created_at_idx" ON "activity_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_action_created_at_idx" ON "activity_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_logs_target_type_target_id_idx" ON "activity_logs"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_email_id_key" ON "email_logs"("email_id");

-- CreateIndex
CREATE INDEX "email_logs_event_type_created_at_idx" ON "email_logs"("event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "email_logs_delivery_status_idx" ON "email_logs"("delivery_status");

-- CreateIndex
CREATE INDEX "product_views_product_id_idx" ON "product_views"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_views_product_id_user_id_day_key" ON "product_views"("product_id", "user_id", "day");

-- CreateIndex
CREATE INDEX "product_contact_clicks_product_id_idx" ON "product_contact_clicks"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_contact_clicks_product_id_user_id_key" ON "product_contact_clicks"("product_id", "user_id");

-- CreateIndex
CREATE INDEX "product_whatsapp_clicks_product_id_idx" ON "product_whatsapp_clicks"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_whatsapp_clicks_product_id_user_id_key" ON "product_whatsapp_clicks"("product_id", "user_id");

-- CreateIndex
CREATE INDEX "service_views_service_id_idx" ON "service_views"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_views_service_id_user_id_day_key" ON "service_views"("service_id", "user_id", "day");

-- CreateIndex
CREATE INDEX "service_contact_clicks_service_id_idx" ON "service_contact_clicks"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_contact_clicks_service_id_user_id_key" ON "service_contact_clicks"("service_id", "user_id");

-- CreateIndex
CREATE INDEX "service_whatsapp_clicks_service_id_idx" ON "service_whatsapp_clicks"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_whatsapp_clicks_service_id_user_id_key" ON "service_whatsapp_clicks"("service_id", "user_id");

-- CreateIndex
CREATE INDEX "shop_views_shop_id_idx" ON "shop_views"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_views_shop_id_user_id_key" ON "shop_views"("shop_id", "user_id");

-- CreateIndex
CREATE INDEX "shop_product_views_shop_id_idx" ON "shop_product_views"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_product_views_shop_id_user_id_key" ON "shop_product_views"("shop_id", "user_id");

-- CreateIndex
CREATE INDEX "shop_contact_clicks_shop_id_idx" ON "shop_contact_clicks"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_contact_clicks_shop_id_user_id_key" ON "shop_contact_clicks"("shop_id", "user_id");

-- CreateIndex
CREATE INDEX "shop_whatsapp_clicks_shop_id_idx" ON "shop_whatsapp_clicks"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_whatsapp_clicks_shop_id_user_id_key" ON "shop_whatsapp_clicks"("shop_id", "user_id");

-- CreateIndex
CREATE INDEX "announcement_views_announcement_id_idx" ON "announcement_views"("announcement_id");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_views_announcement_id_user_id_day_key" ON "announcement_views"("announcement_id", "user_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_wallet_code_key" ON "wallets"("wallet_code");

-- CreateIndex
CREATE INDEX "wallets_wallet_type_is_frozen_idx" ON "wallets"("wallet_type", "is_frozen");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_owner_id_wallet_type_key" ON "wallets"("owner_id", "wallet_type");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_transaction_code_key" ON "wallet_transactions"("transaction_code");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_created_at_idx" ON "wallet_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_transactions_merchant_id_created_at_idx" ON "wallet_transactions"("merchant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_transactions_status_created_at_idx" ON "wallet_transactions"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_transactions_payment_method_idx" ON "wallet_transactions"("payment_method");

-- CreateIndex
CREATE INDEX "wallet_transactions_created_at_idx" ON "wallet_transactions"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_ledger_entries_ledger_code_key" ON "wallet_ledger_entries"("ledger_code");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_wallet_id_created_at_idx" ON "wallet_ledger_entries"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_related_transaction_id_idx" ON "wallet_ledger_entries"("related_transaction_id");

-- CreateIndex
CREATE INDEX "wallet_ledger_entries_related_entity_type_related_entity_id_idx" ON "wallet_ledger_entries"("related_entity_type", "related_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawals_withdrawal_code_key" ON "withdrawals"("withdrawal_code");

-- CreateIndex
CREATE INDEX "withdrawals_status_created_at_idx" ON "withdrawals"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "withdrawals_merchant_id_created_at_idx" ON "withdrawals"("merchant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "withdrawals_wallet_id_idx" ON "withdrawals"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refund_code_key" ON "refunds"("refund_code");

-- CreateIndex
CREATE INDEX "refunds_refund_status_created_at_idx" ON "refunds"("refund_status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "refunds_customer_id_created_at_idx" ON "refunds"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "refunds_merchant_id_created_at_idx" ON "refunds"("merchant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "refunds_original_transaction_id_idx" ON "refunds"("original_transaction_id");

-- CreateIndex
CREATE INDEX "merchant_deals_merchant_id_created_at_idx" ON "merchant_deals"("merchant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_audit_logs_log_code_key" ON "wallet_audit_logs"("log_code");

-- CreateIndex
CREATE INDEX "wallet_audit_logs_subject_user_id_created_at_idx" ON "wallet_audit_logs"("subject_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_audit_logs_admin_id_created_at_idx" ON "wallet_audit_logs"("admin_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_audit_logs_action_created_at_idx" ON "wallet_audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_audit_logs_target_type_target_id_idx" ON "wallet_audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_owner_id_fkey" FOREIGN KEY ("shop_owner_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_owner_id_fkey" FOREIGN KEY ("user_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_offerer_id_fkey" FOREIGN KEY ("offerer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_offers" ADD CONSTRAINT "product_offers_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_threads" ADD CONSTRAINT "broadcast_threads_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_threads" ADD CONSTRAINT "broadcast_threads_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_threads" ADD CONSTRAINT "broadcast_threads_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_messages" ADD CONSTRAINT "broadcast_messages_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_messages" ADD CONSTRAINT "broadcast_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "broadcast_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_messages" ADD CONSTRAINT "broadcast_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_messages" ADD CONSTRAINT "broadcast_messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_offers" ADD CONSTRAINT "broadcast_offers_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_offers" ADD CONSTRAINT "broadcast_offers_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "broadcast_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_offers" ADD CONSTRAINT "broadcast_offers_offerer_id_fkey" FOREIGN KEY ("offerer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_offers" ADD CONSTRAINT "broadcast_offers_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_contact_clicks" ADD CONSTRAINT "product_contact_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_contact_clicks" ADD CONSTRAINT "product_contact_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_whatsapp_clicks" ADD CONSTRAINT "product_whatsapp_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_whatsapp_clicks" ADD CONSTRAINT "product_whatsapp_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_views" ADD CONSTRAINT "service_views_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_views" ADD CONSTRAINT "service_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contact_clicks" ADD CONSTRAINT "service_contact_clicks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contact_clicks" ADD CONSTRAINT "service_contact_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_whatsapp_clicks" ADD CONSTRAINT "service_whatsapp_clicks_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_whatsapp_clicks" ADD CONSTRAINT "service_whatsapp_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_views" ADD CONSTRAINT "shop_views_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_views" ADD CONSTRAINT "shop_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_product_views" ADD CONSTRAINT "shop_product_views_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_product_views" ADD CONSTRAINT "shop_product_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_contact_clicks" ADD CONSTRAINT "shop_contact_clicks_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_contact_clicks" ADD CONSTRAINT "shop_contact_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_whatsapp_clicks" ADD CONSTRAINT "shop_whatsapp_clicks_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_whatsapp_clicks" ADD CONSTRAINT "shop_whatsapp_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_views" ADD CONSTRAINT "announcement_views_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_views" ADD CONSTRAINT "announcement_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_frozen_by_fkey" FOREIGN KEY ("frozen_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_deal_snapshot_id_fkey" FOREIGN KEY ("deal_snapshot_id") REFERENCES "merchant_deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_related_transaction_id_fkey" FOREIGN KEY ("related_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_original_transaction_id_fkey" FOREIGN KEY ("original_transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_deals" ADD CONSTRAINT "merchant_deals_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_deals" ADD CONSTRAINT "merchant_deals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_settings" ADD CONSTRAINT "wallet_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_audit_logs" ADD CONSTRAINT "wallet_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_audit_logs" ADD CONSTRAINT "wallet_audit_logs_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

