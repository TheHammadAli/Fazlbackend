import { ConfigService } from "@nestjs/config";
export declare class SearchService {
    private readonly configService;
    private readonly AUTOCOMPLETE_URL;
    private readonly DETAILS_URL;
    constructor(configService: ConfigService);
    autocompleteLocations(input: string): Promise<any[]>;
    private getCoordinates;
}
