import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker/locale/vi';
import { random, randomDateBetween, randomFromArray } from './seed-utils';

// Entities (giữ nguyên import của bạn)
import { Company } from '../../modules/master-data/entities/company.entity';
import { Employee } from '../../modules/master-data/entities/employee.entity';
import { Shift } from '../../modules/master-data/entities/shift.entity';
import { ShiftRestRule } from '../../modules/master-data/entities/shift-rest-rule.entity';
import { AttendanceGroup } from '../../modules/master-data/entities/attendance-group.entity';
import { JobLevel } from '../../modules/master-data/entities/job-level.entity';
import { EmployeeType } from '../../modules/master-data/entities/employee-type.entity';
import { EmployeeStatus } from '../../modules/master-data/entities/employee-status.entity';
import { LeaveType } from '../../modules/master-data/entities/leave-type.entity';
import { AttendanceMethod } from '../../modules/master-data/entities/attendance-method.entity';
import { TimesheetAdjustmentType } from '../../modules/master-data/entities/timesheet-adjustment-type.entity';
import { WorkLocation } from '../../modules/master-data/entities/work-locations.entity';
import { Department } from '../../modules/master-data/entities/department.entity';
import { ShiftAssignment } from '../../modules/attendance/entities/shift-assignment.entity';
import { LeavePolicy } from '../../modules/master-data/entities/leave-policy.entity';
import { LeavePolicyRule } from '../../modules/master-data/entities/leave-policy-rule.entity';

import { EmploymentStatusCode } from 'src/constants';

export const initDataSeed = async (dataSource: DataSource) => {
  console.log('🧹 Bắt đầu seed dữ liệu mẫu đầy đủ các trường hợp...'); // 0. TRUNCATE toàn bộ (giữ cấu trúc bảng)

  const tables = dataSource.entityMetadatas
    .map((e) => `"${e.tableName}"`)
    .join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`); // ──────────────────────────────────────────────
  // 1. COMPANY (chỉ 1 công ty để đơn giản)
  // ──────────────────────────────────────────────

  const company = await dataSource.getRepository(Company).save({
    companyName: 'UpBase Global JSC',
    taxCode: '0109876543',
    address: 'Tầng 5, Tòa nhà ABC, Quận 1, TP.HCM',
    status: 'ACTIVE',
  });
  const companyId = company.id; // ──────────────────────────────────────────────
  // 2. MASTER DATA – Các bảng danh mục
  // ──────────────────────────────────────────────
  // JobLevel – các cấp bậc phổ biến

  const jobLevels = await dataSource.getRepository(JobLevel).save([
    { companyId, code: 'STAFF', levelName: 'Nhân viên', status: 'ACTIVE' },
    {
      companyId,
      code: 'TEAM_LEAD',
      levelName: 'Trưởng nhóm',
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'MANAGER',
      levelName: 'Quản lý phòng ban',
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'SENIOR_MGR',
      levelName: 'Quản lý cấp cao',
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'DIRECTOR',
      levelName: 'Giám đốc khối',
      status: 'ACTIVE',
    },
  ]); // EmployeeType – các loại hình lao động

  const empTypes = await dataSource.getRepository(EmployeeType).save([
    { companyId, code: 'OFFICIAL', typeName: 'Chính thức' },
    { companyId, code: 'PROBATION', typeName: 'Thử việc' },
    { companyId, code: 'SEASONAL', typeName: 'Thời vụ' },
    { companyId, code: 'COLLABORATOR', typeName: 'Cộng tác viên' },
    { companyId, code: 'PART_TIME', typeName: 'Bán thời gian' },
    { companyId, code: 'SHIFT_WORKER', typeName: 'Ca kíp' },
  ]); // EmployeeStatus – các trạng thái phổ biến

  const empStatuses = await dataSource.getRepository(EmployeeStatus).save([
    { companyId, code: 'WORKING', statusName: 'Đang làm việc' },
    { companyId, code: 'PROBATION_END', statusName: 'Hết thử việc' },
    { companyId, code: 'RESIGNED', statusName: 'Đã nghỉ việc' },
    { companyId, code: 'TERMINATED', statusName: 'Sa thải' },
    { companyId, code: 'MATERNITY_LEAVE', statusName: 'Nghỉ thai sản' },
    { companyId, code: 'SUSPENDED', statusName: 'Tạm đình chỉ' },
  ]); // AttendanceMethod – các phương thức chấm công

  const attMethods = await dataSource.getRepository(AttendanceMethod).save([
    { companyId, code: 'NONE', methodName: 'Không chấm công' },
    { companyId, code: 'LARK_APP', methodName: 'Lark Attendance' },
    { companyId, code: 'LARK_WEBHOOK', methodName: 'Lark Webhook' },
    { companyId, code: 'FACE_ID', methodName: 'Face ID' },
    { companyId, code: 'TIME_MACHINE', methodName: 'Máy chấm công' },
    { companyId, code: 'EXCEL_IMPORT', methodName: 'Import Excel' },
  ]); // LeaveType – các loại nghỉ phép phổ biến ở VN

  const leaveTypes = await dataSource.getRepository(LeaveType).save([
    {
      companyId,
      code: 'ANNUAL_LEAVE',
      leaveTypeName: 'Nghỉ phép năm',
      isDeductLeave: true,
    },
    {
      companyId,
      code: 'UNPAID_LEAVE',
      leaveTypeName: 'Nghỉ không lương',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'SICK_LEAVE',
      leaveTypeName: 'Nghỉ ốm',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'MARRIAGE_SELF',
      leaveTypeName: 'Kết hôn bản thân',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'MARRIAGE_CHILD',
      leaveTypeName: 'Con kết hôn',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'FUNERAL_LEAVE',
      leaveTypeName: 'Nghỉ hiếu',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'PATERNITY_LEAVE',
      leaveTypeName: 'Nghỉ sinh con (bố)',
      isDeductLeave: false,
    },
    {
      companyId,
      code: 'MATERNITY_LEAVE',
      leaveTypeName: 'Nghỉ thai sản',
      isDeductLeave: false,
    },
  ]); // TimesheetAdjustmentType – các loại điều chỉnh công

  await dataSource.getRepository(TimesheetAdjustmentType).save([
    { companyId, adjustmentTypeName: 'Quên chấm công / quẹt thẻ' },
    { companyId, adjustmentTypeName: 'Lỗi thiết bị / hệ thống' },
    { companyId, adjustmentTypeName: 'Làm thêm giờ được phê duyệt' },
    { companyId, adjustmentTypeName: 'Đi muộn / về sớm có phép' },
  ]); // ──────────────────────────────────────────────
  // 3. LEAVE POLICY + RULE (đại diện mọi loại nghỉ)
  // ──────────────────────────────────────────────

  const leavePolicy = await dataSource.getRepository(LeavePolicy).save({
    companyId,
    policyName: 'Chính sách nghỉ phép chuẩn 2026',
    standardWorkdaysInPolicy: 22,
    description: 'Áp dụng cho toàn công ty trừ trường hợp đặc biệt',
  });

  await dataSource.getRepository(LeavePolicyRule).save(
    leaveTypes.map((lt) => ({
      policyId: leavePolicy.id,
      leaveTypeId: lt.id,
      quotaDays:
        lt.code === 'ANNUAL_LEAVE'
          ? 14
          : lt.code === 'MARRIAGE_SELF'
            ? 3
            : lt.code === 'MARRIAGE_CHILD'
              ? 1
              : lt.code === 'FUNERAL_LEAVE'
                ? 3
                : null, // các loại còn lại không giới hạn hoặc BHXH chi trả
      isDeductLeave: lt.isDeductLeave,
    })),
  ); // ──────────────────────────────────────────────
  // 4. WORK LOCATION & DEPARTMENT (cấu trúc phân cấp)
  // ──────────────────────────────────────────────

  const workLocations = await dataSource.getRepository(WorkLocation).save([
    {
      companyId,
      locationName: 'Trụ sở chính TP.HCM',
      address: 'Quận 1, TP.HCM',
      isHeadOffice: true,
    },
    {
      companyId,
      locationName: 'Chi nhánh Hà Nội',
      address: 'Cầu Giấy, Hà Nội',
    },
    {
      companyId,
      locationName: 'Kho & Xưởng Bình Dương',
      address: 'Thủ Dầu Một, Bình Dương',
    },
    {
      companyId,
      locationName: 'Cửa hàng Quận 7',
      address: 'Phú Mỹ Hưng, Quận 7',
    },
  ]);

  const khoiTech = await dataSource.getRepository(Department).save({
    companyId,
    departmentName: 'Khối Công nghệ',
    departmentCode: 'K_TECH',
  });
  const khoiSales = await dataSource.getRepository(Department).save({
    companyId,
    departmentName: 'Khối Kinh doanh',
    departmentCode: 'K_SALES',
  });
  const khoiOps = await dataSource.getRepository(Department).save({
    companyId,
    departmentName: 'Khối Vận hành',
    departmentCode: 'K_OPS',
  });

  await dataSource.getRepository(Department).save([
    {
      companyId,
      departmentName: 'Phòng Backend',
      parentId: khoiTech.id,
      departmentCode: 'P_BACKEND',
    },
    {
      companyId,
      departmentName: 'Phòng Frontend',
      parentId: khoiTech.id,
      departmentCode: 'P_FRONTEND',
    },
    {
      companyId,
      departmentName: 'Phòng Mobile',
      parentId: khoiTech.id,
      departmentCode: 'P_MOBILE',
    },
    {
      companyId,
      departmentName: 'Phòng Sales Miền Bắc',
      parentId: khoiSales.id,
      departmentCode: 'P_SALES_HN',
    },
    {
      companyId,
      departmentName: 'Phòng Sales Miền Nam',
      parentId: khoiSales.id,
      departmentCode: 'P_SALES_HCM',
    },
    {
      companyId,
      departmentName: 'Bộ phận Cửa hàng',
      parentId: khoiOps.id,
      departmentCode: 'P_STORE',
    },
    {
      companyId,
      departmentName: 'Bộ phận Xưởng',
      parentId: khoiOps.id,
      departmentCode: 'P_FACTORY',
    },
  ]); // ──────────────────────────────────────────────
  // 5. SHIFT + REST RULE (đa dạng ca – văn phòng, thai sản, cửa hàng, xưởng)
  // ──────────────────────────────────────────────

  const shiftRepo = dataSource.getRepository(Shift);
  const restRepo = dataSource.getRepository(ShiftRestRule);

  const shiftsData = [
    // Văn phòng bình thường
    {
      code: 'VP_08_17',
      name: 'Văn phòng 8h-17h',
      start: '08:00',
      end: '17:00',
      hours: 8,
      restS: '12:00',
      restE: '13:00',
    },
    {
      code: 'VP_09_18',
      name: 'Văn phòng 9h-18h',
      start: '09:00',
      end: '18:00',
      hours: 8,
      restS: '12:30',
      restE: '13:30',
    }, // Ca thai sản (giảm giờ, đa dạng khung nghỉ)
    {
      code: 'TS_08_16',
      name: 'Thai sản 8h-16h',
      start: '08:00',
      end: '16:00',
      hours: 7,
      restS: '11:30',
      restE: '13:00',
    },
    {
      code: 'TS_08_30_16_30',
      name: 'Thai sản 8:30-16:30',
      start: '08:30',
      end: '16:30',
      hours: 7,
      restS: '12:00',
      restE: '13:30',
    }, // Ca cửa hàng (ngắn, nhiều khung)
    {
      code: 'STORE_MORNING',
      name: 'Ca sáng cửa hàng',
      start: '08:00',
      end: '12:00',
      hours: 4,
      restS: null,
      restE: null,
    },
    {
      code: 'STORE_AFTERNOON',
      name: 'Ca chiều cửa hàng',
      start: '13:00',
      end: '18:00',
      hours: 5,
      restS: null,
      restE: null,
    },
    {
      code: 'STORE_EVENING',
      name: 'Ca tối cửa hàng',
      start: '17:00',
      end: '22:00',
      hours: 5,
      restS: null,
      restE: null,
    }, // Ca xưởng
    {
      code: 'FACTORY_08_17',
      name: 'Xưởng 8h-17h',
      start: '08:00',
      end: '17:00',
      hours: 8,
      restS: '12:00',
      restE: '13:00',
    },
  ];

  const savedShifts: Shift[] = [];
  for (const s of shiftsData) {
    const shift = await shiftRepo.save({
      companyId,
      code: s.code,
      shiftName: s.name,
      startTime: new Date(`2026-01-01T${s.start}:00+07:00`),
      endTime: new Date(`2026-01-01T${s.end}:00+07:00`),
      shiftHours: s.hours,
      allowLateMinutes: 15,
      allowEarlyMinutes: 15,
    });
    savedShifts.push(shift);

    if (s.restS && s.restE) {
      await restRepo.save({
        shiftId: shift.id,
        restBeginTime: `${s.restS}:00`,
        restEndTime: `${s.restE}:00`,
      });
    }
  } // ──────────────────────────────────────────────
  // 6. ATTENDANCE GROUP
  // ──────────────────────────────────────────────

  const groups = await dataSource.getRepository(AttendanceGroup).save([
    {
      companyId,
      code: 'OFFICE',
      groupName: 'Nhân viên văn phòng',
      defaultShiftId: savedShifts.find((s) => s.code === 'VP_08_17')?.id,
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'MATERNITY',
      groupName: 'Nhân viên nghỉ thai sản',
      defaultShiftId: savedShifts.find((s) => s.code === 'TS_08_16')?.id,
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'STORE',
      groupName: 'Nhân viên cửa hàng',
      defaultShiftId: savedShifts.find((s) => s.code === 'STORE_MORNING')?.id,
      status: 'ACTIVE',
    },
    {
      companyId,
      code: 'FACTORY',
      groupName: 'Nhân viên xưởng',
      defaultShiftId: savedShifts.find((s) => s.code === 'FACTORY_08_17')?.id,
      status: 'ACTIVE',
    },
  ]); // ──────────────────────────────────────────────
  // 7. EMPLOYEE – đa dạng mọi trường hợp
  // ──────────────────────────────────────────────

  const employeeRepo = dataSource.getRepository(Employee);
  const employees: Partial<Employee>[] = [];

  const departments = await dataSource
    .getRepository(Department)
    .find({ where: { companyId } });

  for (let i = 1; i <= 40; i++) {
    const isFemale = faker.datatype.boolean();
    const isResigned = i <= 4; // 4 người đã nghỉ
    const isMaternity = isFemale && i % 7 === 0;
    const isProbation = i % 5 === 0;
    const isPartTime = i % 9 === 0;
    const is_saturday_off = i % 2 === 0;
    const is_maternity_shift = i % 9 === 0;
    const is_angel = i % 2 === 0;

    const joinedAt = faker.date.past({ years: 4 });
    const resignedAt = isResigned
      ? faker.date.between({ from: joinedAt, to: new Date() })
      : null;

    employees.push({
      companyId,
      userId: `${1000 + i}`,
      userName: `user${i}`,
      fullName: faker.person.fullName({ sex: isFemale ? 'female' : 'male' }),
      email: `user${i}@upbase.global`,
      phoneNumber: faker.phone.number(),
      gender: isFemale ? 'FEMALE' : 'MALE',
      birthday: faker.date.birthdate({ min: 22, max: 48, mode: 'age' }),
      joinedAt,
      resignedAt,
      workLocation: randomFromArray(workLocations),
      departments: faker.helpers.arrayElements(departments, { min: 1, max: 2 }),
      attendanceGroup: randomFromArray(groups),
      jobLevel: randomFromArray(jobLevels),
      employeeType: isProbation
        ? empTypes.find((t) => t.code === 'PROBATION')!
        : isPartTime
          ? empTypes.find((t) => t.code === 'PART_TIME')!
          : randomFromArray(empTypes),
      employeeStatus: resignedAt
        ? empStatuses.find((s) => s.code === 'RESIGNED')!
        : isMaternity
          ? empStatuses.find((s) => s.code === 'MATERNITY_LEAVE')!
          : randomFromArray(
              empStatuses.filter(
                (s) => !['RESIGNED', 'TERMINATED'].includes(s.code!),
              ),
            ),
      attendanceMethod: randomFromArray(attMethods),
      is_saturday_off: is_saturday_off,
      is_angel: is_angel,
      is_maternity_shift: is_maternity_shift,
      leavePolicy: leavePolicy,
      standardWorkdays: 22,
      larkId: `lark_${10000 + i}`,
    });
  }

  await employeeRepo.save(employees);

  console.log('✅ Hoàn thành seed dữ liệu – đầy đủ các trường hợp nghiệp vụ');
};
