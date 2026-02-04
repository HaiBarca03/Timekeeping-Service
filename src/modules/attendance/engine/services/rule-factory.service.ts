import { Injectable } from '@nestjs/common';
import { COMPANIES } from 'src/constants/company.constants';
import { ATTENDANCE_GROUPS } from 'src/constants/attendance-group.constants';
import { EmployeeTypeCode } from 'src/constants/employee-type.constants';

export interface LateEarlyRule {
  allowedLateMinutes: number;
  allowedEarlyMinutes: number;
  latePenalties: { threshold: number; penalty: number }[];
  earlyPenalties: { threshold: number; penalty: number }[];
  missCheckInPenalty: number;
  missCheckOutPenalty: number;
  ignoreForTypes?: EmployeeTypeCode[]; // ví dụ TTS, CTV không phạt
}

@Injectable()
export class RuleFactoryService {
  getLateEarlyRule(
    companyName: string,
    groupName: string | undefined,
    employeeType: string | undefined,
  ): LateEarlyRule {
    const defaultRule: LateEarlyRule = {
      allowedLateMinutes: 10,
      allowedEarlyMinutes: 10,
      latePenalties: [
        { threshold: 15, penalty: 0.25 },
        { threshold: 60, penalty: 0.5 },
      ],
      earlyPenalties: [
        { threshold: 30, penalty: 0.25 },
      ],
      missCheckInPenalty: 1.0,
      missCheckOutPenalty: 0.5,
      ignoreForTypes: [EmployeeTypeCode.INTERN, EmployeeTypeCode.COLLABORATOR],
    };

    // Customize theo công ty
    if (companyName === COMPANIES.STAAAR) {
      return {
        ...defaultRule,
        allowedLateMinutes: 15,
        latePenalties: [
          { threshold: 15, penalty: 0.25 },
          { threshold: 45, penalty: 0.5 },
          { threshold: 90, penalty: 1.0 },
        ],
      };
    }

    // Customize theo nhóm ca
    if (groupName?.includes('hanhchinh')) {
      return {
        ...defaultRule,
        allowedLateMinutes: 5,
        allowedEarlyMinutes: 5,
      };
    }

    return defaultRule;
  }

  // Có thể thêm các method khác sau
}