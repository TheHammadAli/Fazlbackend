"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
const common_1 = require("@nestjs/common");
class AppError extends Error {
    code;
    status;
    originalError;
    constructor(message, code = "INTERNAL_ERROR", status = common_1.HttpStatus.INTERNAL_SERVER_ERROR, originalError) {
        super(message);
        this.code = code;
        this.status = status;
        this.originalError = originalError;
        this.name = "AppError";
        if (originalError instanceof common_1.HttpException) {
            const res = originalError.getResponse();
            this.message = typeof res === "string" ? res : res["message"];
            this.code = typeof res === "object" ? res["error"] : code;
            this.status = originalError.getStatus();
        }
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
//# sourceMappingURL=app-error.js.map