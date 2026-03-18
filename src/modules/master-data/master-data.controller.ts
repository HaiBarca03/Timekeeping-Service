import { Controller, Get, Query, Param, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { EmployeesResponseDto } from './dto/employees-response.dto';

@ApiTags('master-data')
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('employees')
  @ApiOperation({
    summary: 'Lấy danh sách nhân viên theo công ty (phân trang)',
    description: 'Trả về nhân viên thuộc companyId, hỗ trợ phân trang',
  })
  @ApiQuery({ name: 'companyId', type: String, required: true, description: 'ID công ty (UUID)' })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Trang hiện tại (default: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Số item mỗi trang (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhân viên phân trang',
    type: EmployeesResponseDto,
  })
  async getEmployees(
    @Query('companyId') companyId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ): Promise<EmployeesResponseDto> {
    return this.masterDataService.findAllEmployees(companyId, page, limit);
  }
}