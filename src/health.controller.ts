import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
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
