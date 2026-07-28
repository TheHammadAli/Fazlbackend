import { CategoryType } from "../schema/category.schema";
declare class CategoryParameterDto {
    name: string;
    values: string[];
}
declare class CategoryParametersDto {
    en: CategoryParameterDto[];
    ur: CategoryParameterDto[];
}
export declare class CreateUpdateCategoryDto {
    name: Record<string, string>;
    description?: Record<string, string>;
    parameters?: CategoryParametersDto;
    icon?: any;
    type: CategoryType;
    sortNumber?: number;
    isDisabled?: boolean;
}
export {};
