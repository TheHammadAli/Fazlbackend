import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { SearchService } from "./search.service";
import { ProductsService } from "src/products/products.service";
import { ServicesService } from "src/services/services.service";
import { SearchAllProductsServiceDto } from "./dto/product-service-search-for.dto";
import { ApiOperation, ApiQuery } from "@nestjs/swagger";
@Controller("search")
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly productsService: ProductsService,
    private readonly servicesService: ServicesService,
  ) {}

  @Get("autocomplete-locations")
  @ApiOperation({
    summary: "Get location autocomplete suggestions from Google Places API",
  })
  @ApiQuery({
    name: "q",
    type: String,
    required: true,
    description: "Search query (e.g. partial city or address)",
  })
  @ApiQuery({
    name: "types",
    type: String,
    required: false,
    description: 'Google place type filter, e.g. "(cities)" for the City field',
  })
  @ApiQuery({ name: "lat", type: Number, required: false, description: "Bias results near this point" })
  @ApiQuery({ name: "lng", type: Number, required: false })
  @ApiQuery({
    name: "withCoordinates",
    type: Boolean,
    required: false,
    description:
      'Defaults to true. Pass "false" to skip the per-result coordinate lookup when only the name is needed.',
  })
  @ApiQuery({
    name: "city",
    type: String,
    required: false,
    description:
      "Drop results outside this city. The lat/lng bias only reorders results — a same-named area in another city still appears without this.",
  })
  async autocomplete(
    @Query("q") query: string,
    @Query("types") types?: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
    @Query("withCoordinates") withCoordinates?: string,
    @Query("city") city?: string,
  ) {
    return this.searchService.autocompleteLocations(query, {
      types,
      // Query strings arrive as strings; Number("") is 0, which would be a
      // valid-looking coordinate, so empty values must not become numbers.
      lat: lat?.trim() ? Number(lat) : undefined,
      lng: lng?.trim() ? Number(lng) : undefined,
      withCoordinates: withCoordinates !== "false",
      city,
    });
  }

  @Get("city-areas")
  @ApiOperation({
    summary: "List the areas of one city, for a field that shows options before anything is typed",
  })
  @ApiQuery({ name: "city", type: String, required: true })
  @ApiQuery({ name: "lat", type: Number, required: false })
  @ApiQuery({ name: "lng", type: Number, required: false })
  async cityAreas(
    @Query("city") city: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
  ) {
    return this.searchService.listCityAreas(
      city,
      lat?.trim() ? Number(lat) : undefined,
      lng?.trim() ? Number(lng) : undefined,
    );
  }

  @Get()
  async searchNearby(
    @Query("type") type: "product" | "service",
    @Query("category") category: string,
    @Query("radius") radius: string,
    @Query("latitude") latitude: string,
    @Query("longitude") longitude: string,
    @Query("page") page = "1",
    @Query("limit") limit = "10",
  ) {
    // Validation
    if (!["product", "service"].includes(type)) {
      throw new BadRequestException('Type must be "product" or "service"');
    }

    const parsedRadius = parseFloat(radius);
    const parsedLatitude = parseFloat(latitude);
    const parsedLongitude = parseFloat(longitude);
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    if (
      isNaN(parsedRadius) ||
      isNaN(parsedLatitude) ||
      isNaN(parsedLongitude)
    ) {
      throw new BadRequestException("Invalid or missing location parameters");
    }

    if (type === "product") {
      return this.productsService.searchNearbyWithCategory(
        category,
        [parsedLatitude, parsedLongitude],
        parsedRadius,
        { page: parsedPage, limit: parsedLimit },
      );
    }

    return this.servicesService.searchNearbyWithCategory(
      category,
      [parsedLatitude, parsedLongitude],
      parsedRadius,
      { page: parsedPage, limit: parsedLimit },
    );
  }

  @Get("all-products")
  async searchAllProducts(@Query() query: SearchAllProductsServiceDto) {
    const { name, category, page = 1, limit = 20, startDate, endDate } = query;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new BadRequestException("Page and limit must be greater than 0");
    }

    return this.productsService.searchProducts({
      name,
      category,
      page,
      limit,
      startDate,
      endDate,
    });
  }

  @Get("all-services")
  async searchAllServices(@Query() query: SearchAllProductsServiceDto) {
    const { name, category, page = 1, limit = 20, startDate, endDate } = query;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new BadRequestException("Page and limit must be greater than 0");
    }

    return this.servicesService.searchServices({
      name,
      category,
      page,
      limit,
      startDate,
      endDate,
    });
  }
}
