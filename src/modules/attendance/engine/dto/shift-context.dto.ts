import { ShiftRestRule } from 'src/modules/master-data/entities/shift-rest-rule.entity';
import { ATTENDANCE_GROUPS } from 'src/constants/attendance-group.constants';
import { Shift } from 'src/modules/master-data/entities/shift.entity';
import { ShiftAssignment } from '../../entities/shift-assignment.entity';

export class ShiftContext {
  shift?: Shift;

  restRule: ShiftRestRule;

  assignments: ShiftAssignment[] = [];

  constructor(shift?: Shift, assignments?: ShiftAssignment[]) {
    if (shift) {
      this.shift = shift;
      this.restRule = shift.restRule;
    }

    if (assignments && assignments.length > 0) {
      this.assignments = assignments;

      if (!shift) {
        const s = assignments[0].shift;
        this.shift = s;
        this.restRule = s?.restRule;
      }
    }
  }

  get rule() {
    // STORE SHIFT
    if (this.assignments.length > 0) {
      const a = this.assignments[0];

      return {
        onTime: a.onTime,
        offTime: a.offTime,
        allowLateMinutes: a.shift?.allowLateMinutes ?? 0,
        allowEarlyMinutes: a.shift?.allowEarlyMinutes ?? 0,
      };
    }

    // OFFICE SHIFT
    if (this.shift) {
      return {
        onTime: this.shift.startTime,
        offTime: this.shift.endTime,
        allowLateMinutes: this.shift.allowLateMinutes,
        allowEarlyMinutes: this.shift.allowEarlyMinutes,
      };
    }

    return null;
  }

  get totalStandardHours(): number {
    if (this.assignments && this.assignments.length > 0) {
      // Cộng dồn shiftHours của từng ca (ví dụ: 1h + 1h + 2h = 4h)
      return this.assignments.reduce(
        (sum, a) => sum + (a.shift?.shiftHours || 0),
        0,
      );
    }
    // Nếu là Office (không có assignments), lấy shiftHours của ca mặc định
    return this.shift?.shiftHours || 8;
  }

  getStandardWorkHours(
    isMaternityShift: boolean = false,
    groupCode?: string,
  ): number {
    let baseHours = this.totalStandardHours;

    // 2. Nếu là thai sản (is_maternity_shift = 1), giờ chuẩn giảm 1 tiếng
    if (isMaternityShift && groupCode === ATTENDANCE_GROUPS.OFFICE_GROUP_1 || groupCode === ATTENDANCE_GROUPS.OFFICE_GROUP_2) {
      return baseHours > 1 ? baseHours - 1 : 0;
    }

    return baseHours;
  }

  isRestTime(time: string): boolean {
    const current = this.toMinutes(time);

    if (
      !this.restRule ||
      !this.restRule.restBeginTime ||
      !this.restRule.restEndTime
    ) {
      return false;
    }

    const begin = this.toMinutes(this.restRule.restBeginTime);
    const end = this.toMinutes(this.restRule.restEndTime);

    return current >= begin && current <= end;
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
