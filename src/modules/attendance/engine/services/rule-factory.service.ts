import { Injectable } from '@nestjs/common';
import { EmployeeTypeCode } from 'src/constants/employee-type.constants';

export interface LateEarlyRule {
  allowedLateMinutes: number;
  allowedEarlyMinutes: number;
  latePenalties: { threshold: number; penalty: number }[];
  earlyPenalties: { threshold: number; penalty: number }[];
  missCheckInPenalty: number;
  missCheckOutPenalty: number;
  ignoreForTypes?: EmployeeTypeCode[];
}

@Injectable()
export class RuleFactoryService {
  getLateEarlyRule(
    companyName: string,
    groupName: string | undefined,
    employeeType: string | undefined,
  ): LateEarlyRule {
    const defaultRule: LateEarlyRule = {
      allowedLateMinutes: 1,
      allowedEarlyMinutes: 1,
      latePenalties: [
        { threshold: 1, penalty: 1.0 }, // trễ >1p 
      ],
      earlyPenalties: [{ threshold: 30, penalty: 0.25 }],
      missCheckInPenalty: 1.0,
      missCheckOutPenalty: 0.5,
    };
    return defaultRule;
  }
}
