declare class LocationDto {
    type: "Point";
    coordinates: [number, number];
}
export declare class CreateUpdateShopDto {
    title: string;
    address: string;
    description: string;
    category: string;
    subcategory?: string;
    marketName?: string;
    area: string;
    city: string;
    contact: string;
    openingHours?: string;
    image?: any;
    banner?: any;
    location: LocationDto;
}
export {};
