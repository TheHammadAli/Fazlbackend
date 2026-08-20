import { SetMetadata } from "@nestjs/common";
import { AdminAction } from "src/common/constants/admin-permissions.constants";

export const REQUIRE_ACTION_KEY = "requiredAction";
export const RequireAction = (action: Exclude<AdminAction, "view">) =>
  SetMetadata(REQUIRE_ACTION_KEY, action);
