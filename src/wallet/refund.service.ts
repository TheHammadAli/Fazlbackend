import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto/pagination-response.dto";
import { COUNTER_KEYS } from "src/common/model/counter.model";
import { generateObjectId, isObjectIdLike } from "src/common/utils/object-id.util";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";
import { CreateRefundDto, RejectRefundDto } from "./dto/create-refund.dto";
import { REFUND_STATUSES, Refund, RefundStatus } from "./model/wallet.model";
import { WalletAuditLogService } from "./wallet-audit-log.service";
import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletTransactionService } from "./wallet-transaction.service";

const partySelect = {
  id: true,
  name: true,
  email: true,
  userCode: true,
} satisfies Prisma.UserSelect;

/** Simple one-step refund workflow (spec §8, confirmed with stakeholder — not a multi-stage
 *  chain like Withdrawals): a refund is created as "pending", then resolved by exactly one
 *  decisive admin action — complete (posts the crediting ledger entry) or reject (reason only,
 *  no ledger effect). The spec's "Admin/Action Log" field is derived from WalletAuditLog
 *  rather than duplicated here, avoiding a second source of truth.
 *
 *  Mongo also kept a `ledgerEntryIds` array on the refund; Postgres keeps only the
 *  WalletLedgerEntry.relatedEntityType/relatedEntityId back-reference that `postEntry`
 *  already writes, so the link has a single source of truth. */
@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: WalletLedgerService,
    private readonly transactionService: WalletTransactionService,
    private readonly auditLogService: WalletAuditLogService,
  ) {}

  private async generateNextCode(client: Prisma.TransactionClient): Promise<string> {
    const counter = await client.counter.upsert({
      where: { id: COUNTER_KEYS.refund },
      create: { id: COUNTER_KEYS.refund, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `RFD-${String(counter.seq).padStart(6, "0")}`;
  }

  private async requireRefund(id: string): Promise<Refund> {
    if (!isObjectIdLike(id)) throw new NotFoundException("Refund not found");
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) throw new NotFoundException("Refund not found");
    return refund;
  }

  async create(dto: CreateRefundDto, adminId: string): Promise<Refund> {
    const original = await this.transactionService.requireById(dto.originalTransactionId);
    if (original.paymentMethod !== "fazl_wallet") {
      throw new BadRequestException(
        "Only Fazl Wallet transactions can be refunded through the wallet ledger",
      );
    }
    if (dto.refundAmountMinor > original.finalCustomerPaymentMinor) {
      throw new BadRequestException("Refund amount cannot exceed the original payment");
    }

    return this.prisma.$transaction(async (tx) => {
      const refundCode = await this.generateNextCode(tx);
      return tx.refund.create({
        data: {
          id: generateObjectId(),
          refundCode,
          originalTransactionId: original.id,
          orderId: original.orderId,
          customerId: original.userId,
          merchantId: original.merchantId,
          refundAmountMinor: dto.refundAmountMinor,
          refundReason: dto.refundReason,
          refundStatus: "pending",
          createdById: adminId,
        },
      });
    });
  }

  async complete(id: string, adminId: string): Promise<Refund> {
    const refund = await this.requireRefund(id);
    if (refund.refundStatus !== "pending") {
      throw new BadRequestException(`Cannot complete a refund in "${refund.refundStatus}" status`);
    }
    const original = await this.transactionService.requireById(refund.originalTransactionId);

    const customerWallet = await this.ledgerService.getOrCreateWallet(original.userId, "user");
    const entry = await this.ledgerService.postEntry({
      walletId: customerWallet.id,
      direction: "credit",
      balanceType: "available",
      amountMinor: refund.refundAmountMinor,
      relatedEntityType: "Refund",
      relatedEntityId: refund.id,
      reason: refund.refundReason,
      createdBy: adminId,
    });

    const creditTxn = await this.transactionService.recordRefundCredit({
      originalTransaction: original,
      refundAmountMinor: refund.refundAmountMinor,
      ledgerEntryIds: [entry.id],
      refundCode: refund.refundCode ?? refund.id,
      createdBy: adminId,
    });

    const updated = await this.prisma.refund.update({
      where: { id },
      data: { refundStatus: "completed" },
    });

    // Includes the refund just completed, so the original transaction flips to "full"
    // as soon as the refunds against it add up to the whole payment.
    const { _sum } = await this.prisma.refund.aggregate({
      where: { originalTransactionId: original.id, refundStatus: "completed" },
      _sum: { refundAmountMinor: true },
    });
    const totalRefunded = _sum.refundAmountMinor ?? 0;
    await this.transactionService.setRefundStatus(
      original.id,
      totalRefunded >= original.finalCustomerPaymentMinor ? "full" : "partial",
    );

    await this.auditLogService.record({
      adminId,
      action: "refund",
      targetType: "Refund",
      targetId: refund.id,
      transactionId: creditTxn.id,
      subjectUserId: original.userId,
      oldValue: { refundStatus: "pending" },
      newValue: { refundStatus: "completed", refundAmountMinor: refund.refundAmountMinor },
      reason: refund.refundReason,
    });
    return updated;
  }

  async reject(id: string, dto: RejectRefundDto, adminId: string): Promise<Refund> {
    const refund = await this.requireRefund(id);
    if (refund.refundStatus !== "pending") {
      throw new BadRequestException(`Cannot reject a refund in "${refund.refundStatus}" status`);
    }

    const updated = await this.prisma.refund.update({
      where: { id },
      data: { refundStatus: "rejected", rejectionReason: dto.reason },
    });

    await this.auditLogService.record({
      adminId,
      action: "refund_rejection",
      targetType: "Refund",
      targetId: id,
      subjectUserId: refund.customerId,
      oldValue: { refundStatus: "pending" },
      newValue: { refundStatus: "rejected" },
      reason: dto.reason,
    });
    return updated;
  }

  async getList(
    filters: {
      search?: string;
      refundStatus?: string;
      customerId?: string;
      merchantId?: string;
      startDate?: string;
      endDate?: string;
    },
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponseDto<any>> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const emptyPage = {
      data: [],
      meta: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
    };

    const where: Prisma.RefundWhereInput = {};

    // An unrecognised enum value is a Prisma validation error rather than a query that
    // matches nothing, so it short-circuits to an empty page instead.
    const refundStatus = filters.refundStatus?.trim();
    if (refundStatus) {
      if (!(REFUND_STATUSES as readonly string[]).includes(refundStatus)) return emptyPage;
      where.refundStatus = refundStatus as RefundStatus;
    }

    const customerId = filters.customerId?.trim();
    if (customerId && isObjectIdLike(customerId)) where.customerId = customerId;

    const merchantId = filters.merchantId?.trim();
    if (merchantId && isObjectIdLike(merchantId)) where.merchantId = merchantId;

    if (filters.startDate || filters.endDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.startDate) createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        createdAt.lte = endOfDay;
      }
      where.createdAt = createdAt;
    }

    const search = filters.search?.trim();
    if (search) {
      where.refundCode = { contains: search, mode: "insensitive" };
    }

    const [rows, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          customer: { select: partySelect },
          merchant: { select: partySelect },
        },
      }),
      this.prisma.refund.count({ where }),
    ]);

    return {
      // `.populate(...)` replaced each id with the object; `include` adds a sibling
      // and leaves the id a string, so both are renamed back.
      data: rows.map(({ customer, merchant, ...r }) => ({
        ...r,
        customerId: customer,
        merchantId: merchant,
      })),
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getDetail(id: string): Promise<any> {
    if (!isObjectIdLike(id)) throw new NotFoundException("Refund not found");
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        customer: { select: partySelect },
        merchant: { select: partySelect },
        originalTransaction: true,
      },
    });
    if (!refund) throw new NotFoundException("Refund not found");

    const { customer, merchant, originalTransaction, ...rest } = refund;
    return {
      ...rest,
      customerId: customer,
      merchantId: merchant,
      originalTransactionId: originalTransaction,
    };
  }
}
