import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AppError } from "./app-error"; // adjust the import path as needed

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = "Internal Server Error";
    let message = "An unexpected error occurred";

    if (exception instanceof AppError) {
      status = exception.status;
      message = exception.message;
      error = exception.code;
      console.error("AppError:", exception.originalError ?? exception.stack);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        error = exception.name.replace("Exception", "");
      } else if (typeof exceptionResponse === "object") {
        message = (exceptionResponse as any).message || message;
        error =
          (exceptionResponse as any).error ||
          exception.name.replace("Exception", "");
      }

      console.error("HttpException:", exception.stack);
    } else {
      console.error("Unhandled Exception:", exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      data: null,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
