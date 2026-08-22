"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiLangHeader = ApiLangHeader;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
function ApiLangHeader() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiHeader)({
        name: "accept-language",
        required: false,
        description: "Language code (e.g. en, ur)",
        schema: {
            default: "en",
        },
    }));
}
//# sourceMappingURL=api-lang-headers.decorator.js.map