import { CategoryType } from "../schema/category.schema";
export declare class CreateUpdateCategoryDto {
    name: Record<string, string>;
    description?: Record<string, string>;
    icon?: any;
    type: CategoryType;
    isDisabled?: boolean;
}
