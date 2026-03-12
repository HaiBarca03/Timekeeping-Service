import { ShiftRestRule } from "src/modules/master-data/entities/shift-rest-rule.entity";
import { Shift } from "src/modules/master-data/entities/shift.entity";
import { ShiftAssignment } from "../../entities/shift-assignment.entity";

export class ShiftContext {
  shift?: Shift;

  restRules: ShiftRestRule[] = [];

  assignments: ShiftAssignment[] = [];

  constructor(shift?: Shift, assignments?: ShiftAssignment[]) {

    if (shift) {
      this.shift = shift;
      this.restRules = shift.restRules || [];
    }

    if (assignments && assignments.length > 0) {
      this.assignments = assignments;

      if (!shift) {
        const s = assignments[0].shift;
        this.shift = s;
        this.restRules = s?.restRules || [];
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
        allowEarlyMinutes: a.shift?.allowEarlyMinutes ?? 0
      };
    }

    // OFFICE SHIFT
    if (this.shift) {
      return {
        onTime: this.shift.startTime,
        offTime: this.shift.endTime,
        allowLateMinutes: this.shift.allowLateMinutes,
        allowEarlyMinutes: this.shift.allowEarlyMinutes
      };
    }

    return null;
  }

  getStandardWorkHours(): number {
    return this.shift?.shiftHours ?? 8;
  }

  isRestTime(time: string): boolean {
    const current = this.toMinutes(time);

    return this.restRules.some(rest => {
      if (!rest.restBeginTime || !rest.restEndTime) return false;

      const begin = this.toMinutes(rest.restBeginTime);
      const end = this.toMinutes(rest.restEndTime);

      return current >= begin && current <= end;
    });
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}