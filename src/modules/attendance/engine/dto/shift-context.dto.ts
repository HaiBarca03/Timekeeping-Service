import { ShiftField } from "src/modules/master-data/entities/shift-field.entity";
import { ShiftRestRule } from "src/modules/master-data/entities/shift-rest-rule.entity";
import { ShiftRule } from "src/modules/master-data/entities/shift-rule.entity";
import { Shift } from "src/modules/master-data/entities/shift.entity";

export class ShiftContext {
  shift: Shift;
  rule: ShiftRule;
  restRules: ShiftRestRule[];
  fields: ShiftField[];

  constructor(shift: Shift) {
    this.shift = shift;
    this.rule = shift.rule;
    this.restRules = shift.restRules || [];
    this.fields = shift.fields || [];
  }

  getStandardWorkHours(): number {
    if (!this.rule.onTime || !this.rule.offTime) return 8; // fallback

    const on = this.rule.onTime.split(':').map(Number);
    const off = this.rule.offTime.split(':').map(Number);
    let hours = off[0] - on[0] + (off[1] - on[1]) / 60;

    // Trừ break time (sẽ chi tiết hơn ở break strategy)
    return hours - this.getTotalBreakHours();
  }

  private getTotalBreakHours(): number {
    return this.restRules.reduce((sum, rest) => {
      const begin = rest.restBeginTime?.split(':').map(Number) || [0, 0];
      const end = rest.restEndTime?.split(':').map(Number) || [0, 0];
      return sum + (end[0] - begin[0] + (end[1] - begin[1]) / 60);
    }, 0);
  }
}