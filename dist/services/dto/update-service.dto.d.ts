export declare class UpdateServiceDto {
    title?: string;
    description?: string;
    price?: number;
    paymentType?: 'hourly' | 'fixed';
    requiresAppointment?: boolean;
    imageUrls?: string[];
    category?: string;
}
