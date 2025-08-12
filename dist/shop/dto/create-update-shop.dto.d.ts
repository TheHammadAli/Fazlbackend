declare class LocationDto {
    type: 'Point';
    coordinates: [number, number];
}
export declare class CreateUpdateShopDto {
    title: string;
    description: string;
    location: LocationDto;
}
export {};
