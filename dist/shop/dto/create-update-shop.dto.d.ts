declare class LocationDto {
    type: "Point";
    coordinates: [number, number];
}
export declare class CreateUpdateShopDto {
    title: string;
    address: string;
    description: string;
    image?: any;
    banner?: any;
    location: LocationDto;
}
export {};
