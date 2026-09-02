import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guard/jwt-auth-guard";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { ProductOfferService } from "./product-offer.service";
import { CreateProductOfferDto } from "./dto/create-product-offer.dto";

@ApiTags("Product Offers")
@Controller("products/offers")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("jwt")
export class ProductOfferController {
  constructor(private readonly offerService: ProductOfferService) {}

  @Post()
  @ApiOperation({ summary: "Submit an offer on a product listing" })
  async submit(
    @Body() dto: CreateProductOfferDto,
    @CurrentUser("sub") userId: string,
  ) {
    return this.offerService.submitOffer(userId, dto);
  }

  @Get("/my/received")
  @ApiOperation({ summary: "My listings that have received at least one offer" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async getMyReceivedOffers(
    @CurrentUser("sub") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.offerService.getMyReceivedOffers(userId, page, limit);
  }

  @Get("/my/sent")
  @ApiOperation({ summary: "Offers I have submitted on other listings" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async getMySentOffers(
    @CurrentUser("sub") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.offerService.getMySentOffers(userId, page, limit);
  }

  @Get("/product/:productId")
  @ApiOperation({ summary: "All offers on one of my products" })
  async getOffersForProduct(
    @Param("productId") productId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.offerService.getOffersForProduct(productId, userId);
  }

  @Patch(":offerId/accept")
  @ApiOperation({ summary: "Accept an offer on my product" })
  async accept(
    @Param("offerId") offerId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.offerService.respondToOffer(offerId, userId, "accept");
  }

  @Patch(":offerId/decline")
  @ApiOperation({ summary: "Decline an offer on my product" })
  async decline(
    @Param("offerId") offerId: string,
    @CurrentUser("sub") userId: string,
  ) {
    return this.offerService.respondToOffer(offerId, userId, "decline");
  }
}
