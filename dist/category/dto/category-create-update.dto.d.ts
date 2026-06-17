import { CategoryType } from "../schema/category.schema";
declare class CategoryParametersDto {
    en: string[];
    ur: string[];
}
export declare class CreateUpdateCategoryDto {
    name: Record<string, string>;
    description?: Record<string, string>;
    parameters?: CategoryParametersDto;
    icon?: any;
    type: CategoryType;
    isDisabled?: boolean;
}
export {};
