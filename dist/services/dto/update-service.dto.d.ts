import { ServiceParameterDto } from "./create-service.dto";
export declare class UpdateServiceDto {
    title?: string;
    description?: string;
    price?: number;
    paymentType?: "hourly" | "fixed" | "call_for_price";
    requiresAppointment?: boolean;
    images: any;
    video: any;
    category?: string;
    parameters?: ServiceParameterDto[];
}
