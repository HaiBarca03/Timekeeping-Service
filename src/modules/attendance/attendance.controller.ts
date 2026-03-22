import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { AttendanceRecordService } from './engine/services/attendance-record.service';
import { BatchPunchResultDto } from './dto/batch-punch-result.dto';
import { GenerateMonthlyTimesheetDto } from './engine/dto/generate-monthly-timesheet.dto';
import { parse } from 'date-fns';
import { CreateOverrideDto } from './dto/backdate-req.dto';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly recordService: AttendanceRecordService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive batch punch data from Lark AnyCross and process',
    description:
      'Endpoint dành riêng để Lark đẩy batch raw punches về. LarkData là JSON raw từ Lark.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch processed successfully',
    type: BatchPunchResultDto,
  })
  @Post('lark-batch-punch')
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: 'companyId',
    required: true,
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      example: {
        user_task_results: [{}, {}],
      },
    },
  })
  async receiveLarkBatchPunch(
    @Query('companyId') companyId: string,
    @Body() larkData: any,
  ): Promise<BatchPunchResultDto> {
    try {
      const flattenedInputs = this.recordService.flattenLarkPunches(
        larkData,
        companyId,
      );

      console.log('Flattened:', flattenedInputs.length);

      return await this.attendanceService.processBatchPunches(flattenedInputs);
    } catch (error) {
      console.error('Lark batch error:', error);
      throw error;
    }
  }

  @Get('daily-timesheet')
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'date', required: true })
  async getDailyTimesheet(
    @Query('companyId') companyId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getTimesheetByDate(companyId, date);
  }

  @Get('monthly-timesheet')
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'employeeId', required: false })
  async getTimesheetByMonth(
    @Query('companyId') companyId: string,
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.attendanceService.getMonthlyTimesheet(
      companyId,
      Number(month),
      Number(year),
      employeeId,
    );
  }

  @Post('generate-monthly-timesheet')
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'employeeId', required: false })
  async generateMonthlyTimesheet(
    @Query('companyId') companyId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.attendanceService.generateMonthlyTimesheet(
      companyId,
      Number(month),
      Number(year),
    );
  }

  // @Post('backdate-override')
  // @ApiOperation({
  //   summary: 'Tạo lệnh đè cấu hình và tính toán lại công (Backdate)',
  //   description:
  //     'Dùng khi muốn thay đổi cấu hình tạm thời cho 1 nhân viên, 1 nhóm hoặc 1 ca trong quá khứ/tương lai.',
  // })
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     example: {
  //       entityType: 'ATTENDANCE_GROUP', // 'SHIFT', 'ATTENDANCE_GROUP', 'EMPLOYEE'
  //       entityId: '123456789',
  //       companyId: '1',
  //       effectiveFrom: '2024-03-01',
  //       effectiveTo: '2024-03-05',
  //       overrideValues: {
  //         isAngel: true,
  //         allowLateMinutes: 60,
  //         shiftContext: { startTime: '09:00' },
  //       },
  //       reason: 'Hỗ trợ đi muộn do sự cố ngập lụt diện rộng',
  //     },
  //   },
  // })
  // async createBackdateOverride(
  //   @Body()
  //   data: {
  //     entityType: string;
  //     entityId: string;
  //     companyId: string;
  //     effectiveFrom: string;
  //     effectiveTo?: string;
  //     overrideValues: Record<string, any>;
  //     reason?: string;
  //   },
  // ) {
  //   // Gọi sang Service đã xử lý logic đẩy Queue Job Cha
  //   return await this.attendanceService.createBackdateOverride(data);
  // }

  @Post('backdate-override')
  async createBackdate(@Body() dto: CreateOverrideDto) {
    return await this.attendanceService.createBackdateOverride(dto);
  }
}
