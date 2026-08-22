export declare class ServiceParameterDto {
    name: string;
    variants: string[];
}
export declare class CreateServiceDto {
    title: string;
    description?: string;
    price: number;
    paymentType: "hourly" | "fixed" | "call_for_price";
    requiresAppointment?: boolean;
    images: any;
    video: any;
    category: string;
    parameters?: ServiceParameterDto[];
}
