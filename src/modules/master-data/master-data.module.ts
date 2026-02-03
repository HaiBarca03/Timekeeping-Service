import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LeavePolicy } from "./entities/leave-policy.entity";
import { OvertimeConversionType } from "./entities/overtime-conversion-type.entity";
import { LeaveType } from "./entities/leave-type.entity";
import { AttendanceGroup } from "./entities/attendance-group.entity";
import { Company } from "./entities/company.entity";
import { Employee } from "./entities/employee.entity";
import { ShiftRestRule } from "./entities/shift-rest-rule.entity";
import { Shift } from "./entities/shift.entity";
import { ShiftRule } from "./entities/shift-rule.entity";
import { EmployeeType } from "./entities/employee-type.entity";
import { MasterDataService } from "./master-data.service";
import { EmployeeStatus } from "./entities/employee-status.entity";
import { LeavePolicyRule } from "./entities/leave-policy-rule.entity";
import { JobLevel } from "./entities/job-level.entity";
import { ShiftField } from "./entities/shift-field.entity";
import { TimesheetAdjustmentType } from "./entities/timesheet-adjustment-type.entity";
import { WorkLocationRequestType } from "./entities/work-location-request-type.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AttendanceGroup,
            AttendanceGroup,
            Company,
            EmployeeStatus,
            EmployeeType,
            Employee,
            JobLevel,
            LeavePolicyRule,
            LeavePolicy,
            LeaveType,
            OvertimeConversionType,
            ShiftField,
            ShiftRestRule,
            ShiftRule,
            Shift,
            TimesheetAdjustmentType,
            WorkLocationRequestType
        ]),
    ],
    controllers: [],
    providers: [MasterDataService],
    exports: [MasterDataService],
})

export class MasterDataModule {}