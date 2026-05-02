declare class ProductParameterDto {
    name: string;
    variants: string[];
}
export declare class UpdateProductDto {
    title?: string;
    description?: string;
    type: "retail" | "classified";
    price?: number;
    category?: string;
    images: any;
    video: any;
    parameters?: ProductParameterDto[];
}
export {};
