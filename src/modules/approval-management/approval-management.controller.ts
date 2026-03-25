import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApprovalManagementService } from './approval-management.service';
import { ApiOperation } from '@nestjs/swagger';
import { ExternalApprovalPayloadDto } from './dto/external-approval.dto';

@Controller('approval-management')
export class ApprovalManagementController {
  constructor(private readonly leaveService: ApprovalManagementService) {}

  @Post('import-external-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import JSON thô từ Base' })
  async importData(
    @Query('companyId') companyId: string,
    @Body() body: ExternalApprovalPayloadDto,
  ) {
    console.log('body', JSON.stringify(body, null, 2));
    return await this.leaveService.importFromExternalSource(body, companyId);
  }
}
