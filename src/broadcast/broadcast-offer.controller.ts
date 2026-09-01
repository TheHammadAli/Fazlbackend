import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { BroadcastOfferService } from "./broadcast-offer.service";
import { CreateBroadcastOfferDto } from "./dto/create-broadcast-offer.dto";

@ApiTags("Broadcast Offers")
@Controller("broadcast/offers")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("jwt")
export class BroadcastOfferController {
  constructor(private readonly offerService: BroadcastOfferService) {}

  @Post()
  @ApiOperation({ summary: "Submit an offer on a received broadcast" })
  async submit(
    @Body() dto: CreateBroadcastOfferDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.offerService.submitOffer(userId, dto);
  }

  @Get("/my")
  @ApiOperation({ summary: "My broadcasts that have received at least one offer" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async getMyOfferedBroadcasts(
    @CurrentUser("sub") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.offerService.getMyBroadcastsWithOffers(userId, page, limit);
  }

  @Get("/broadcast/:broadcastId")
  @ApiOperation({ summary: "All offers on one of my broadcasts" })
  async getOffersForBroadcast(
    @Param("broadcastId") broadcastId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.offerService.getOffersForBroadcast(broadcastId, userId);
  }

  @Patch(":offerId/accept")
  @ApiOperation({ summary: "Accept an offer — unlocks chat for that thread" })
  async accept(
    @Param("offerId") offerId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.offerService.respondToOffer(offerId, userId, "accept");
  }

  @Patch(":offerId/decline")
  @ApiOperation({ summary: "Decline an offer" })
  async decline(
    @Param("offerId") offerId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.offerService.respondToOffer(offerId, userId, "decline");
  }
}
