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
import { CreateOverrideDto } from './dto/backdate-req.dto';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly recordService: AttendanceRecordService,
  ) { }

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
  @Post('backdate-override')
  async createBackdate(@Body() dto: CreateOverrideDto) {
    return await this.attendanceService.createBackdateOverride(dto);
  }

  @Post('calculate-daily-batch')
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'date', required: false, description: 'yyyy-mm-dd (default: yesterday)' })
  async calculateDailyBatch(
    @Query('companyId') companyId: string,
    @Query('date') date?: string,
  ) {
    return await this.attendanceService.calculateDailyBatch(companyId, date);
  }
}
