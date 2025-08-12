export declare class CreateServiceDto {
    title: string;
    video: string;
    description?: string;
    price: number;
    paymentType: 'hourly' | 'fixed';
    requiresAppointment?: boolean;
    imageUrls?: string[];
    category: string;
}
