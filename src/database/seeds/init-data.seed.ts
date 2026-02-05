import { DataSource } from 'typeorm';

// ===== ENTITIES =====
import { Company } from '../../modules/master-data/entities/company.entity';
import { Employee } from '../../modules/master-data/entities/employee.entity';
import { Shift } from '../../modules/master-data/entities/shift.entity';
import { ShiftRule } from '../../modules/master-data/entities/shift-rule.entity';
import { ShiftRestRule } from '../../modules/master-data/entities/shift-rest-rule.entity';
import { ShiftField } from '../../modules/master-data/entities/shift-field.entity';
import { AttendanceGroup } from '../../modules/master-data/entities/attendance-group.entity';
import { JobLevel } from '../../modules/master-data/entities/job-level.entity';
import { EmployeeType } from '../../modules/master-data/entities/employee-type.entity';
import { EmployeeStatus } from '../../modules/master-data/entities/employee-status.entity';
import { LeavePolicy } from '../../modules/master-data/entities/leave-policy.entity';
import { LeavePolicyRule } from '../../modules/master-data/entities/leave-policy-rule.entity';
import { LeaveType } from '../../modules/master-data/entities/leave-type.entity';
import { AttendanceMethod } from '../../modules/master-data/entities/attendance-method.entity';
import { OvertimeConversionType } from '../../modules/master-data/entities/overtime-conversion-type.entity';
import { TimesheetAdjustmentType } from '../../modules/master-data/entities/timesheet-adjustment-type.entity';
import { WorkLocationRequestType } from '../../modules/master-data/entities/work-location-request-type.entity';

// ===== HELPER =====
const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export const initDataSeed = async (dataSource: DataSource) => {
  console.log('🧹 Cleaning database...');

  // 1️⃣ TRUNCATE – giữ bảng, xoá data
  const tables = dataSource.entityMetadatas
    .map(e => `"${e.tableName}"`)
    .join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);

  // 2️⃣ COMPANY
  const company = await dataSource.getRepository(Company).save({
    companyName: 'UpBase Global',
  });
  const companyId = company.id;

  // 3️⃣ MASTER DATA
  const jobLevels = await dataSource.getRepository(JobLevel).save([
    { companyId, levelName: 'Intern' },
    { companyId, levelName: 'Junior' },
    { companyId, levelName: 'Senior' },
    { companyId, levelName: 'Manager' },
  ]);

  const empTypes = await dataSource.getRepository(EmployeeType).save([
    { companyId, typeName: 'Văn phòng' },
    { companyId, typeName: 'Hiện trường' },
  ]);

  const empStatuses = await dataSource.getRepository(EmployeeStatus).save([
    { companyId, statusName: 'Đang làm việc' },
    { companyId, statusName: 'Thử việc' },
  ]);

  const attMethods = await dataSource.getRepository(AttendanceMethod).save([
    { companyId, methodName: 'Lark Webhook' },
    { companyId, methodName: 'FaceID' },
  ]);

  const leaveTypes = await dataSource.getRepository(LeaveType).save([
    { companyId, leaveTypeName: 'Nghỉ phép năm', isDeductLeave: true },
    { companyId, leaveTypeName: 'Nghỉ không lương', isDeductLeave: false },
  ]);

  await dataSource.getRepository(TimesheetAdjustmentType).save([
    { companyId, adjustmentTypeName: 'Quên quẹt thẻ' },
    { companyId, adjustmentTypeName: 'Lỗi thiết bị' },
  ]);

  await dataSource.getRepository(WorkLocationRequestType).save([
    { companyId, typeName: 'Làm việc tại khách hàng' },
    { companyId, typeName: 'Công tác tỉnh' },
  ]);

  await dataSource.getRepository(OvertimeConversionType).save([
    { companyId, conversionName: 'Ngày thường x1.5', multiplier: 1.5 },
  ]);

  // 4️⃣ LEAVE POLICY
  const policy = await dataSource.getRepository(LeavePolicy).save({
    companyId,
    policyName: 'Chính sách chuẩn 2026',
    standardWorkdaysInPolicy: 22,
  });

  await dataSource.getRepository(LeavePolicyRule).save(
    leaveTypes.map(type => ({
      policyId: policy.id,
      leaveTypeId: type.id,
      quotaDays: type.isDeductLeave ? 12 : 0,
      isDeductLeave: type.isDeductLeave,
    })),
  );

  // 5️⃣ SHIFT + RULE
  const shift = await dataSource.getRepository(Shift).save({
    companyId,
    shiftName: 'Ca Hành Chính',
  });

  await dataSource.getRepository(ShiftRule).save({
    shiftId: shift.id,
    onTime: '08:30:00',
    offTime: '17:30:00',
    lateMinutesAsLate: 15,
    earlyMinutesAsEarly: 15,
  });

  await dataSource.getRepository(ShiftRestRule).save({
    shiftId: shift.id,
    restBeginTime: '12:00:00',
    restEndTime: '13:00:00',
  });

  await dataSource.getRepository(ShiftField).save({
    shiftId: shift.id,
    fieldName: 'Tự động duyệt',
    isFlexible: true,
  });

  // 6️⃣ ATTENDANCE GROUP
  const group = await dataSource.getRepository(AttendanceGroup).save({
    companyId,
    groupName: 'Toàn công ty',
    defaultShiftId: shift.id,
  });

  // 7️⃣ EMPLOYEES – RANDOM ĐÚNG NGHIỆP VỤ
  const employeeRepo = dataSource.getRepository(Employee);
  const employees: Employee[] = [];

  for (let i = 1; i <= 50; i++) {
    employees.push(
      employeeRepo.create({
        companyId,
        employeeCode: `${1000 + i}`,
        fullName: `Nhân viên UpBase ${i}`,
        email: `user${i}@upbase.vn`,
        attendanceGroup: group,
        jobLevel: random(jobLevels),
        employeeType: random(empTypes),
        employeeStatus: random(empStatuses),
        attendanceMethod: random(attMethods),
        leavePolicy: policy,
      }),
    );
  }

  await employeeRepo.save(employees);

  console.log('✅ Seed xong – đầy đủ, random, đúng nghiệp vụ');
};
