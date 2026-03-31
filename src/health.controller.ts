import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Check service health' })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'OK',
      },
    },
  })
  health() {
    return {
      status: 'OK',
    };
  }
}
