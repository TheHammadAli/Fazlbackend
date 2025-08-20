export declare class UpdateServiceDto {
    title?: string;
    description?: string;
    price?: number;
    paymentType?: 'hourly' | 'fixed';
    requiresAppointment?: boolean;
    images: any;
    video: any;
    category?: string;
}
