import { Controller, Post, Body } from '@nestjs/common';
import { LeaveManagementService } from './leave-management.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ImportLeaveDto } from './dto/import-leave.dto'; 

@ApiTags('Leave Management')
@Controller('leave-management')
export class LeaveManagementController {
  constructor(private readonly leaveService: LeaveManagementService) {}

  @Post('import-multi-leave')
  @ApiOperation({ 
    summary: 'Import hàng loạt phiếu nghỉ phép', 
    description: 'Tự động duyệt (APPROVED) và kích hoạt Worker tính lại công cho nhân viên' 
  })
  @ApiBody({ type: [ImportLeaveDto] }) 
  @ApiResponse({ status: 201, description: 'Import thành công và đã đẩy job vào Queue.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async importMulti(@Body() leaveRequests: ImportLeaveDto[]) {
    return await this.leaveService.processBulkLeaves(leaveRequests);
  }
}