import { Injectable } from '@nestjs/common';
import { RawPunchInputDto } from '../dto/raw-punch.input';
import { PUNCH_TYPES } from 'src/constants/attendance-record.constants';

@Injectable()
export class AttendanceRecordService {
  flattenLarkPunches(larkData: any, companyId: string): RawPunchInputDto[] {
    const flattenedPunches: RawPunchInputDto[] = [];

    larkData.user_task_results.forEach((userTask) => {
      const day = userTask.day;
      userTask.records.forEach((record) => {
        if (record.check_in_record?.record_id) {
          flattenedPunches.push(
            this.mapToRawPunch(userTask, record, PUNCH_TYPES.IN, companyId, day),
          );
        }

        if (record.check_out_record?.record_id) {
          flattenedPunches.push(
            this.mapToRawPunch(userTask, record, PUNCH_TYPES.OUT, companyId, day),
          );
        }
      });
    });

    return flattenedPunches;
  }

  private mapToRawPunch(
    userTask: any,
    record: any,
    type: typeof PUNCH_TYPES[keyof typeof PUNCH_TYPES],
    companyId: string,
    day: number
  ): RawPunchInputDto {
    const isCheckIn = type === PUNCH_TYPES.IN;
    const larkRecord = isCheckIn
      ? record.check_in_record
      : record.check_out_record;
    const result = isCheckIn ? record.check_in_result : record.check_out_result;
    const targetShiftTime = isCheckIn
      ? record.check_in_shift_time
      : record.check_out_shift_time;

    return {
      company_id: companyId,
      external_user_id: userTask.user_id,
      day: day,
      punch_time: new Date(
        parseInt(larkRecord.check_time) * 1000,
      ).toISOString(),
      lark_record_id: larkRecord.record_id,
      punch_type: type,
      punch_result: result,
      source_type: larkRecord.is_wifi ? 'WIFI' : 'GPS',
      latitude: larkRecord.latitude,
      longitude: larkRecord.longitude,
      address: larkRecord.location_name,
      device_id: larkRecord.device_id,
      ssid: larkRecord.ssid,
      photo_url: larkRecord.photo_urls?.[0] || null,
      shift_time_target: targetShiftTime
        ? new Date(parseInt(targetShiftTime) * 1000).toISOString()
        : undefined,
      raw_payload: larkRecord,
    };
  }
}
