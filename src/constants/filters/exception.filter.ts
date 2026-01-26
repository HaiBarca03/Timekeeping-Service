import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import { BusinessCodes } from 'src/constants/business.code';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private formatValidationErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => {
      return {
        field: error.property,
        errors: Object.values(error.constraints || {}),
      };
    });
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    let message: any = 'Internal server error';
    let businessCode = -1;
    let validationErrors: any[] | null = null;

    if (Array.isArray(exception) && exception[0] instanceof ValidationError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      businessCode = BusinessCodes.ERROR.code;

      validationErrors = this.formatValidationErrors(exception);
      message = validationErrors;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse['message']
      ) {
        message = Array.isArray(exceptionResponse['message'])
          ? exceptionResponse['message'][0]
          : exceptionResponse['message'];

        businessCode = exceptionResponse['businessCode'];
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
      businessCode: businessCode,
    });
  }
}
