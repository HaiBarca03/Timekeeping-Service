import { ValidationPipeOptions } from '@nestjs/common';

const validationOptions: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  exceptionFactory: (errors) => errors,
};

export default validationOptions;
