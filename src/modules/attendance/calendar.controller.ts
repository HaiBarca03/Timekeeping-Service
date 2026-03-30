import { Controller, Post, Patch, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
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

  @Patch('holidays/:id')
  @ApiOperation({ summary: 'Update an existing holiday' })
  @ApiParam({ name: 'id', description: 'Internal ID of the holiday' })
  async updateHoliday(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.calendarService.updateHoliday(id, dto);
  }

  @Post('holidays/bulk')
  @ApiOperation({ summary: 'Bulk create/update holidays' })
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

  @Patch('shift-assignments/:id')
  @ApiOperation({ summary: 'Update an existing shift assignment' })
  @ApiParam({ name: 'id', description: 'Internal ID of the assignment' })
  async updateShiftAssignment(@Param('id') id: string, @Body() dto: UpdateShiftAssignmentDto) {
    return this.calendarService.updateShiftAssignment(id, dto);
  }

  @Post('shift-assignments/bulk')
  @ApiOperation({ summary: 'Bulk create/update shift assignments' })
  async bulkCreateShiftAssignments(@Body() body: CreateManyShiftAssignmentsDto) {
    return this.calendarService.bulkCreateShiftAssignments(body.data);
  }
}
