import { Injectable } from "@nestjs/common";
import { RawPunchInput } from "../../graphql/inputs/raw-punch.input";

@Injectable()
export class AttendanceRecordService {
  flattenLarkPunches(larkData: any, companyId: string): RawPunchInput[] {
    const flattenedPunches: RawPunchInput[] = [];

    larkData.user_task_results.forEach(userTask => {
      userTask.records.forEach(record => {
        
        if (record.check_in_record?.record_id) {
          flattenedPunches.push(this.mapToRawPunch(userTask, record, 'IN', companyId));
        }

        if (record.check_out_record?.record_id) {
          flattenedPunches.push(this.mapToRawPunch(userTask, record, 'OUT', companyId));
        }
      });
    });

    return flattenedPunches;
  }

  private mapToRawPunch(userTask: any, record: any, type: 'IN' | 'OUT', companyId: string): RawPunchInput {
    const isCheckIn = type === 'IN';
    const larkRecord = isCheckIn ? record.check_in_record : record.check_out_record;
    const result = isCheckIn ? record.check_in_result : record.check_out_result;
    const targetShiftTime = isCheckIn ? record.check_in_shift_time : record.check_out_shift_time;

    return {
      company_id: companyId,
      external_user_id: userTask.user_id, 
      punch_time: new Date(parseInt(larkRecord.check_time) * 1000),
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
      shift_time_target: targetShiftTime ? new Date(parseInt(targetShiftTime) * 1000) : undefined,
      raw_payload: larkRecord,
    };
  }
}