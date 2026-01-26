import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, businessCode: number) {
    super(
      {
        message,
        businessCode,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
