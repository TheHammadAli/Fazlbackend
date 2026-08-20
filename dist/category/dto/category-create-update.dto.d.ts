import { CategoryType } from "../schema/category.schema";
declare class CategoryParameterEntryDto {
    name: string;
    values: string[];
    isOptional?: boolean;
    allowCustomValue?: boolean;
    allowMultiple?: boolean;
}
declare class CategoryParametersDto {
    en: CategoryParameterEntryDto[];
    ur: CategoryParameterEntryDto[];
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
