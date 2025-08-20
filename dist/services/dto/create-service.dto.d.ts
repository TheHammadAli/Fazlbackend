export declare class CreateServiceDto {
    title: string;
    description?: string;
    price: number;
    paymentType: 'hourly' | 'fixed';
    requiresAppointment?: boolean;
    images: any;
    video: any;
    category: string;
}
