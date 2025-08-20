import { Location } from '../schema/users.interfaces';
declare class LocationDto implements Location {
    type: 'Point';
    coordinates: [number, number];
}
export declare class CreateUpdateUserDto {
    email: string;
    password: string;
    name: string;
    phone: string;
    address: string;
    roles: ('buyer' | 'seller' | 'admin' | 'subadmin')[];
    language: 'en' | 'ur';
    isVerified: boolean;
    location: LocationDto;
    image: any;
    provider: string;
    refreshToken: null | string;
    resetPasswordToken: null | string;
    resetPasswordExpires: null | Date;
}
export {};
