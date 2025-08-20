declare class LocationDto {
    type: 'Point';
    coordinates: [number, number];
}
export declare class CreateUpdateShopDto {
    title: string;
    description: string;
    image: any;
    location: LocationDto;
}
export {};
