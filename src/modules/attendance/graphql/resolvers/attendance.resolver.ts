import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { BatchPunchResult } from '../types/batch-punch-response';
import { AttendanceService } from '../../attendance.service';
import { AttendanceRecordService } from '../../engine/services/attendance-record.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class AttendanceResolver {
  constructor(
    private attendanceService: AttendanceService,
    private recordService: AttendanceRecordService,
  ) {}

  @Mutation(() => BatchPunchResult)
  async receiveLarkBatchPunch(
    @Args({ name: 'larkData', type: () => GraphQLJSON }) larkData: any,
    @Args({ name: 'companyId' }) companyId: string,
  ): Promise<BatchPunchResult> {
    
    const flattenedInputs = this.recordService.flattenLarkPunches(larkData, companyId);

    return this.attendanceService.processBatchPunches(flattenedInputs);
  }
}