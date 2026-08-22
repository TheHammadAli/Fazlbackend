"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSubscriptionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_subscription_dto_1 = require("./create-subscription.dto");
class UpdateSubscriptionDto extends (0, swagger_1.PartialType)(create_subscription_dto_1.CreateSubscriptionDto) {
}
exports.UpdateSubscriptionDto = UpdateSubscriptionDto;
//# sourceMappingURL=update-subscription.dto.js.map