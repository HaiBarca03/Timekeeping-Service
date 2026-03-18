import { Body, Controller, Post, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { LeaveManagementService } from './leave-management.service';
import { ApiOperation } from '@nestjs/swagger';
import { ImportLeaveDto } from './dto/import-leave.dto';

@Controller('leave-management')
export class LeaveManagementController {
  constructor(private readonly leaveService: LeaveManagementService) {}

  @Post('import-external-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import JSON thô từ Base' })
  async importData(
    @Query('companyId') companyId: string,
    @Body() body: ImportLeaveDto
  ) {
    console.log('body', body)
    return await this.leaveService.importFromExternalSource(body, companyId);
  }
}