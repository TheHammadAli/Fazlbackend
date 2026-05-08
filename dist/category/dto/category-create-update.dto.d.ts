import { CategoryType } from "../schema/category.schema";
export declare class CreateUpdateCategoryDto {
    name: Record<string, string>;
    type: CategoryType;
    isDisabled?: boolean;
}
