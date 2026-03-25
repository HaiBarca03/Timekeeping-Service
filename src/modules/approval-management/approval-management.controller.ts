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
import { ImportLeaveDto } from './dto/import-leave.dto';

@Controller('approval-management')
export class ApprovalManagementController {
  constructor(private readonly leaveService: ApprovalManagementService) {}

  @Post('import-external-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import JSON thô từ Base' })
  async importData(
    @Query('companyId') companyId: string,
    @Body() body: ImportLeaveDto,
  ) {
    console.log('body', body);
    return await this.leaveService.importFromExternalSource(body, companyId);
  }
}
