declare class ProductParameterDto {
    name: string;
    variants: string[];
}
export declare class CreateProductDto {
    title: string;
    description?: string;
    price: number;
    category: string;
    type: "retail" | "classified";
    images: any;
    video: any;
    parameters?: ProductParameterDto[];
}
export {};
