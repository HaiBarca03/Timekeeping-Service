import { DataSource } from 'typeorm';

// ===== ENTITIES =====
import { Company } from '../../modules/master-data/entities/company.entity';
import { Employee } from '../../modules/master-data/entities/employee.entity';
import { Shift } from '../../modules/master-data/entities/shift.entity';
// import { ShiftRule } from '../../modules/master-data/entities/shift-rule.entity';
import { ShiftRestRule } from '../../modules/master-data/entities/shift-rest-rule.entity';
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
import { faker } from '@faker-js/faker/locale/vi';
import { WorkLocation } from 'src/modules/master-data/entities/work-locations.entity';
import { Department } from 'src/modules/master-data/entities/department.entity';
import { EmploymentStatusCode } from 'src/constants';
import { OvertimeRequest } from 'src/modules/leave-management/entities/overtime-request.entity';
import { LeaveRequest } from 'src/modules/leave-management/entities/leave-request.entity';
import { LeaveRequestItem } from 'src/modules/leave-management/entities/leave-request-item.entity';
import { AttendanceDailyTimesheet } from 'src/modules/attendance/entities/attendance-daily-timesheet.entity';
import { ShiftAssignment } from 'src/modules/attendance/entities/shift-assignment.entity';

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
    { 
      companyId, 
      code: 'OFFICE', 
      levelName: 'Văn phòng', 
      status: 'ACTIVE' 
    },
    { 
      companyId, 
      code: 'FACTORY', 
      levelName: 'Xưởng', 
      status: 'ACTIVE' 
    },
    { 
      companyId, 
      code: 'STORE', 
      levelName: 'Cửa hàng', 
      status: 'ACTIVE' 
    },
    { 
      companyId, 
      code: 'OTHERS', 
      levelName: 'Khác', 
      status: 'ACTIVE' 
    },
  ]);

  const empTypes = await dataSource.getRepository(EmployeeType).save(
    [
      { companyId, code: 'OFFICIAL', typeName: 'Chính thức' },
      { companyId, code: 'PROBATION', typeName: 'Thử việc' },
      { companyId, code: 'SEASONAL', typeName: 'Thời vụ' },
      { companyId, code: 'COLLABORATOR', typeName: 'Cộng tác viên' },
      { companyId, code: 'SHIFT_WORKER', typeName: 'Nhân viên ca kíp' }
    ]
  );

  const empStatuses = await dataSource.getRepository(EmployeeStatus).save([
    { companyId, code: 'WORKING', statusName: 'Đang làm việc' },
    { companyId, code: 'RESIGNED', statusName: 'Đã nghỉ' },
    { companyId, code: 'MATERNITY_LEAVE', statusName: 'Nghỉ thai sản' },
    { companyId, code: 'SUSPENDED', statusName: 'Tạm nghỉ' },
  ]);

  const attMethods = await dataSource.getRepository(AttendanceMethod).save([
    { companyId, code: 'LARK_WEBHOOK', methodName: 'Lark Webhook' },
    { companyId, code: 'FACE_ID', methodName: 'FaceID' },
    { companyId, code: 'TIME_MACHINE', methodName: 'Máy chấm công' },
    { companyId, code: 'LARK_APP', methodName: 'Lark Attendance' },
    { companyId, code: 'NONE', methodName: 'Không cần chấm công' },
    { companyId, code: 'EXCEL_IMPORT', methodName: 'Import công' },
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
  const shiftRepo = dataSource.getRepository(Shift);
  const restRepo = dataSource.getRepository(ShiftRestRule);

  // Định nghĩa danh sách các ca dựa trên ảnh của bạn
  const shiftsToSeed = [
    { name: 'Ca Văn Phòng 1', code: 'VP_1', start: '08:00', restS: '12:00', restE: '13:00', end: '17:00', hours: 8 },
    { name: 'Ca Văn Phòng 2', code: 'VP_2', start: '08:30', restS: '12:00', restE: '13:00', end: '17:30', hours: 8 },
    { name: 'Ca thai sản 1',  code: 'TS_1', start: '09:00', restS: '12:00', restE: '13:00', end: '17:00', hours: 7 },
    { name: 'Ca thai sản 2',  code: 'TS_2', start: '08:00', restS: '11:00', restE: '13:00', end: '17:00', hours: 7 },
    { name: 'Ca thai sản 3',  code: 'TS_3', start: '08:00', restS: '12:00', restE: '14:00', end: '17:00', hours: 7 },
    { name: 'Ca thai sản 4',  code: 'TS_4', start: '08:00', restS: '12:00', restE: '13:00', end: '16:00', hours: 7 },
    { name: 'Ca thai sản 5',  code: 'TS_5', start: '08:30', restS: '11:30', restE: '13:00', end: '17:00', hours: 7 },
    { name: 'Ca thai sản 6',  code: 'TS_6', start: '08:30', restS: '12:00', restE: '13:30', end: '17:00', hours: 7 },
    { name: 'Ca thai sản 7',  code: 'TS_7', start: '08:30', restS: '12:00', restE: '13:00', end: '16:30', hours: 7 },
    { name: 'Ca thai sản 8',  code: 'TS_8', start: '08:00', restS: '11:30', restE: '13:30', end: '17:00', hours: 7 },
    { name: 'Ca thai sản 9',  code: 'TS_9', start: '08:00', restS: '11:30', restE: '13:00', end: '16:30', hours: 7 },
    { name: 'Ca thai sản 10', code: 'TS_10', start: '08:00', restS: '12:00', restE: '13:30', end: '16:30', hours: 7 },
  ];

  for (const s of shiftsToSeed) {
    // Lưu bảng Shift
    const newShift = await shiftRepo.save(shiftRepo.create({
      companyId,
      code: s.code,
      shiftName: s.name,
      startTime: new Date(`2026-02-11T${s.start}:00+07:00`),
      endTime: new Date(`2026-02-11T${s.end}:00+07:00`),
      shiftHours: s.hours,
      allowLateMinutes: 1,
      allowEarlyMinutes: 1,
    }));

    // Lưu bảng ShiftRestRule
    await restRepo.save(restRepo.create({
      shiftId: newShift.id,
      restBeginTime: `${s.restS}:00`,
      restEndTime: `${s.restE}:00`,
    }));
  }
  
  const storeAndFactoryShifts = [
    // --- KHỐI CỬA HÀNG ---
    { name: 'Ca Cửa hàng 1', code: 'STORE_1', start: '08:00', end: '09:00', hours: 1, restS: null, restE: null },
    { name: 'Ca Cửa hàng 2', code: 'STORE_2', start: '09:00', end: '12:00', hours: 3, restS: null, restE: null },
    { name: 'Ca Cửa hàng 3', code: 'STORE_3', start: '12:00', end: '15:00', hours: 3, restS: null, restE: null },
    { name: 'Ca Cửa hàng 4', code: 'STORE_4', start: '15:00', end: '18:00', hours: 3, restS: null, restE: null },
    { name: 'Ca Cửa hàng 5', code: 'STORE_5', start: '18:00', end: '21:00', hours: 3, restS: null, restE: null },
    { name: 'Ca Cửa hàng 6', code: 'STORE_6', start: '21:00', end: '22:00', hours: 1, restS: null, restE: null },
    
    // --- KHỐI XƯỞNG (Trong ảnh ghi Ca Văn Phòng 1 nhưng nằm cột Khối Xưởng) ---
    { name: 'Ca Văn Phòng 1 (Xưởng)', code: 'FACTORY_OFFICE_1', start: '08:00', end: '17:00', hours: 8, restS: '12:00', restE: '13:00' },
  ];

  for (const s of storeAndFactoryShifts) {
    const newShift = await shiftRepo.save(shiftRepo.create({
      companyId,
      code: s.code,
      shiftName: s.name,
      startTime: new Date(`2026-02-11T${s.start}:00+07:00`),
      endTime: new Date(`2026-02-11T${s.end}:00+07:00`),
      shiftHours: s.hours,
      allowLateMinutes: 1, 
      allowEarlyMinutes: 1,
    }));

    // Nếu có giờ nghỉ thì mới lưu vào bảng RestRule
    if (s.restS && s.restE) {
      await restRepo.save(restRepo.create({
        shiftId: newShift.id,
        restBeginTime: `${s.restS}:00`,
        restEndTime: `${s.restE}:00`,
      }));
    }
  }

  // 6️⃣ ATTENDANCE GROUP
  const groupRepo = dataSource.getRepository(AttendanceGroup);

  const allSavedShifts = await shiftRepo.find({ where: { companyId } });
  
  const findShiftId = (code: string) => allSavedShifts.find(s => s.code === code)?.id;

  const groups = await groupRepo.save([
    {
      companyId,
      code: 'OFFICE_GROUP',
      groupName: 'Nhóm Văn phòng',
      // Lấy ID của ca Văn Phòng 1 (VP_1)
      defaultShiftId: findShiftId('VP_1'), 
      status: 'ACTIVE'
    },
    {
      companyId,
      code: 'FACTORY_GROUP',
      groupName: 'Nhóm Khối Xưởng',
      // Lấy ID của ca Văn Phòng 1 - Xưởng (FACTORY_OFFICE_1)
      defaultShiftId: findShiftId('FACTORY_OFFICE_1'), 
      status: 'ACTIVE'
    },
    {
      companyId,
      code: 'STORE_GROUP',
      groupName: 'Nhóm Cửa hàng',
      // Lấy ID của ca Cửa hàng 1 (STORE_1) hoặc ca phổ biến nhất của shop
      defaultShiftId: findShiftId('STORE_1'), 
      status: 'ACTIVE'
    },
    {
      companyId,
      code: 'ALL',
      groupName: 'Toàn công ty',
      defaultShiftId: findShiftId('VP_1'),
      status: 'ACTIVE'
    }
  ]);

  // 1️⃣ TẠO WORK LOCATIONS TRƯỚC
  const locationRepo = dataSource.getRepository(WorkLocation);
  const locations = await locationRepo.save([
    locationRepo.create({ companyId, locationName: 'Văn phòng chính (HCM)', address: 'Quận 1, TP.HCM' }),
    locationRepo.create({ companyId, locationName: 'Chi nhánh Hà Nội', address: 'Cầu Giấy, Hà Nội' }),
  ]);

  const deptRepo = dataSource.getRepository(Department);
  
  // Tạo các Khối (Parent)
  const khoiTech = await deptRepo.save(deptRepo.create({ companyId, departmentName: 'Khối Công nghệ', departmentCode: 'K_TECH' }));
  const khoiSales = await deptRepo.save(deptRepo.create({ companyId, departmentName: 'Khối Kinh doanh', departmentCode: 'K_SALES' }));

  // Tạo các Phòng (Child)
  const phongDev = await deptRepo.save(deptRepo.create({ companyId, departmentName: 'Phòng Phát triển Phần mềm', parentId: khoiTech.id, departmentCode: 'P_DEV' }));
  const phongApp = await deptRepo.save(deptRepo.create({ companyId, departmentName: 'Phòng Mobile App', parentId: khoiTech.id, departmentCode: 'P_APP' }));
  const phongSaleHN = await deptRepo.save(deptRepo.create({ companyId, departmentName: 'Phòng Sales Hà Nội', parentId: khoiSales.id, departmentCode: 'P_SHN' }));

  const allDepts = [khoiTech, khoiSales, phongDev, phongApp, phongSaleHN];

  // 7️⃣ EMPLOYEES – RANDOM ĐÚNG NGHIỆP VỤ
  const employeeRepo = dataSource.getRepository(Employee);
  const employees: Employee[] = [];

  for (let i = 1; i <= 50; i++) {
    const joinedAt = faker.date.past({ years: 3 }); 
    const isResigned = faker.number.int({ min: 1, max: 20 }) === 1;
    const resignedAt = isResigned ? faker.date.between({ from: joinedAt, to: new Date() }) : (null as any);    

    const birthday = faker.date.birthdate({ min: 20, max: 45, mode: 'age' });
    const gender = faker.helpers.arrayElement(['MALE', 'FEMALE']);
    const targetLocation = random(locations);
    const selectedDepts = faker.helpers.arrayElements(allDepts, { min: 1, max: 2 });
    const randomGroup = faker.helpers.arrayElement(groups);

    employees.push(
      employeeRepo.create({
        companyId,
        workLocationId: targetLocation.id,
        userId: `${1000 + i}`,
        userName: `user${i}`,
        fullName: faker.person.fullName(), 
        email: `user${i}@upbase.vn`,
        phoneNumber: faker.phone.number(),
        gender: gender,
        birthday: birthday,
        joinedAt: joinedAt,
        resignedAt: resignedAt,
        
        attendanceGroup: randomGroup,
        jobLevel: random(jobLevels),
        employeeType: random(empTypes),
        employeeStatus: resignedAt 
          ? empStatuses.find(s => s.statusName === EmploymentStatusCode.RESIGNED) 
          : random(empStatuses.filter(s => s.statusName !== EmploymentStatusCode.RESIGNED)),
        
        attendanceMethod: random(attMethods),
        leavePolicy: policy,
        // Gán nơi làm việc
        workLocation: targetLocation, 
        departments: selectedDepts,
        standardWorkdays: 22,
        larkId: `lark_id_${i}`,
      }),
    );
  }

  await employeeRepo.save(employees);

    const storeShifts = await shiftRepo.find({
      where: [
        { code: 'STORE_1' },
        { code: 'STORE_2' },
        { code: 'STORE_3' },
        { code: 'STORE_4' },
        { code: 'STORE_5' },
        { code: 'STORE_6' },
      ],
    });

    const storeEmployees = employees.filter(
      e => e.attendanceGroup?.code === 'STORE_GROUP'
    );
    const shiftAssignmentRepo = dataSource.getRepository(ShiftAssignment);
    const assignments: ShiftAssignment[] = [];
    for (const emp of storeEmployees) {
      
      for (let d = 0; d < 7; d++) {
        
        const workDate = new Date('2026-02-11T00:00:00+07:00');
        workDate.setDate(workDate.getDate() + d);

        // random 2–4 ca mỗi ngày
        const dailyShifts = faker.helpers.arrayElements(storeShifts, {
          min: 2,
          max: 4
        });

        for (const shift of dailyShifts) {

          const start = new Date(shift.startTime);
          const end = new Date(shift.endTime);

          const onTime = new Date(workDate);
          onTime.setHours(start.getHours(), start.getMinutes(), 0, 0);

          const offTime = new Date(workDate);
          offTime.setHours(end.getHours(), end.getMinutes(), 0, 0);

          assignments.push(
            shiftAssignmentRepo.create({
              companyId,
              employeeId: emp.id,
              storeId: emp.workLocationId,
              date: workDate,
              shiftId: shift.id,
              onTime,
              offTime,
              isActive: true,
            })
          );

        }

      }

    }

    await shiftAssignmentRepo.save(assignments);
  console.log('✅ Seed xong – đầy đủ, random, đúng nghiệp vụ');
};
