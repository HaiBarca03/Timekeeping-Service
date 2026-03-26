import { Controller, Get, Post, Patch, Query, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { EmployeesResponseDto } from './dto/employees-response.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

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
  ): Promise<any> {
    return this.masterDataService.findAllEmployees(companyId, page, limit);
  }

  @Post('employees')
  @ApiOperation({
    summary: 'Tạo mới nhân viên',
    description: 'Tạo mới nhân viên sử dụng originID cho các mối quan hệ liên kết',
  })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({
    status: 201,
    description: 'Nhân viên đã được tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ hoặc không tìm thấy quan hệ liên kết qua originID',
  })
  async createEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.masterDataService.createEmployee(createEmployeeDto);
  }

  @Patch('employees/:id')
  @ApiOperation({
    summary: 'Cập nhật thông tin nhân viên',
    description: 'Cập nhật nhân viên theo ID, hỗ trợ cập nhật quan hệ qua originID',
  })
  @ApiParam({ name: 'id', description: 'ID nội bộ của nhân viên (bigint/string)' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật nhân viên thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy nhân viên',
  })
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.masterDataService.updateEmployee(id, updateEmployeeDto);
  }
}