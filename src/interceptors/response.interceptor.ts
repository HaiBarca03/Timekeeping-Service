import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BusinessCodes } from 'src/constants/business.code';
import { CommonResponse } from 'src/utils/types/common-response';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  CommonResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<CommonResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const successResponse: CommonResponse<T> = {
          code: 200,
          businessCode: BusinessCodes.SUCCESS.code,
          message: BusinessCodes.SUCCESS.message,
          data,
        };

        return successResponse;
      }),
    );
  }
}
