"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let SearchService = class SearchService {
    configService;
    AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
    DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";
    constructor(configService) {
        this.configService = configService;
    }
    async autocompleteLocations(input) {
        const apiKey = this.configService.getOrThrow("GOOGLE_LOCATION_API_KEY");
        const params = new URLSearchParams({
            input,
            key: apiKey,
            language: "en",
            components: "country:pk",
        });
        const res = await fetch(`${this.AUTOCOMPLETE_URL}?${params.toString()}`);
        if (!res.ok)
            throw new Error(`Google API error: ${res.statusText}`);
        const data = await res.json();
        const enriched = await Promise.all(data.predictions.map(async (p) => {
            const coords = await this.getCoordinates(p.place_id, apiKey);
            return {
                description: p.description,
                place_id: p.place_id,
                coordinates: coords,
            };
        }));
        return enriched;
    }
    async getCoordinates(placeId, apiKey) {
        const params = new URLSearchParams({
            place_id: placeId,
            key: apiKey,
            fields: "geometry",
        });
        const res = await fetch(`${this.DETAILS_URL}?${params.toString()}`);
        if (!res.ok)
            throw new Error(`Google API error: ${res.statusText}`);
        const data = await res.json();
        return data.result?.geometry?.location ?? null;
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SearchService);
//# sourceMappingURL=search.service.js.map