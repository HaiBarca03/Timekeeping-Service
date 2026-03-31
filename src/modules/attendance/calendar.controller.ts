import { Controller, Post, Patch, Body, Param, Query, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { CreateManyHolidaysDto } from './dto/create-many-holidays.dto';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { CreateManyShiftAssignmentsDto } from './dto/create-many-shift-assignments.dto';

@ApiTags('calendar')
@Controller('attendance')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) { }

  // --- Holiday APIs ---

  @Post('holidays')
  @ApiOperation({ summary: 'Create a new holiday' })
  @ApiResponse({ status: 201, description: 'Holiday created successfully' })
  async createHoliday(@Body() dto: CreateHolidayDto) {
    return this.calendarService.createHoliday(dto);
  }

  @Patch('holidays/:date')
  @ApiOperation({ summary: 'Update holiday by date' })
  @ApiParam({ name: 'date', description: 'Format: YYYY-MM-DD' })
  async updateHoliday(
    @Param('date') date: string,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateHolidayDto
  ) {
    return this.calendarService.updateHoliday(date, companyId, dto);
  }

  @Post('holidays/bulk')
  @ApiOperation({ summary: 'Bulk create holidays' })
  async bulkCreateHolidays(@Body() body: CreateManyHolidaysDto) {
    return this.calendarService.bulkCreateHolidays(body.data);
  }

  // --- ShiftAssignment APIs ---

  @Post('shift-assignments')
  @ApiOperation({ summary: 'Create a new shift assignment' })
  @ApiResponse({ status: 201, description: 'Shift assignment created successfully' })
  async createShiftAssignment(@Body() dto: CreateShiftAssignmentDto) {
    return this.calendarService.createShiftAssignment(dto);
  }

  @Patch('shift-assignments/:originId')
  @ApiOperation({ summary: 'Update an existing shift assignment' })
  @ApiParam({ name: 'originId', description: 'Internal originId of the assignment' })
  async updateShiftAssignment(@Param('originId') originId: string, @Body() dto: UpdateShiftAssignmentDto) {
    return this.calendarService.updateShiftAssignment(originId, dto);
  }

  @Post('shift-assignments/bulk')
  @ApiOperation({ summary: 'Bulk create shift assignments' })
  async bulkCreateShiftAssignments(@Body() body: CreateManyShiftAssignmentsDto) {
    return this.calendarService.bulkCreateShiftAssignments(body.data);
  }

  @Get('shift-assignments/:originId')
  @ApiOperation({ summary: 'Get shift assignment by originId' })
  @ApiParam({ name: 'originId', description: 'Internal originId of the assignment' })
  async getShiftAssignmentByOriginId(@Param('originId') originId: string) {
    return this.calendarService.getShiftAssignmentByOriginId(originId);
  }

  @Get('shift-assignments')
  @ApiOperation({ summary: 'Get all shift assignments' })
  async getAllShiftAssignments() {
    return this.calendarService.getAllShiftAssignments();
  }
}
