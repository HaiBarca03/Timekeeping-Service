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
import { Holiday } from 'src/modules/attendance/entities/holidays.entity';

export const initDataSeed = async (dataSource: DataSource) => {
  console.log('🧹 Bắt đầu seed dữ liệu mẫu đầy đủ các trường hợp...');

  const tables = dataSource.entityMetadatas
    .map((e) => `"${e.tableName}"`)
    .join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);

  const companyRepo = dataSource.getRepository(Company);

  // 1. Công ty Staaar
  const company1 = await companyRepo.save({
    originId: 'LMONNKZO7X5',
    companyName: 'Công ty cổ phần Staaar',
    taxCode: '0109876543',
    address: 'Địa chỉ của Staaar',
    status: 'ACTIVE',
  });
  const companyId = company1.id;

  // 2. Công ty HSH Việt Nam
  const company2 = await companyRepo.save({
    originId: 'LED1Z523PXK',
    companyName: 'Công ty TNHH Xuất nhập khẩu HSH Việt Nam',
    taxCode: '0109876544',
    address: 'Địa chỉ HSH',
    status: 'ACTIVE',
  });
  const companyId2 = company2.id;

  // 3. Công ty Winning & Co
  const company3 = await companyRepo.save({
    originId: 'LEGNPX0DA0G',
    companyName: 'Công ty Cổ phần Winning & Co',
    taxCode: '0109876545',
    address: 'Địa chỉ Winning',
    status: 'ACTIVE',
  });
  const companyId3 = company3.id;

  // 4. Công ty Intellife
  const company4 = await companyRepo.save({
    originId: 'LMLND1GRZO3',
    companyName: 'Công ty cổ phần Intellife',
    taxCode: '0109876546',
    address: 'Địa chỉ Intellife',
    status: 'ACTIVE',
  });
  const companyId4 = company4.id;
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
  ]);
  // TimesheetAdjustmentType – các loại điều chỉnh công

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
  );

  const locationsData = [
    { name: 'T Trần Duy Hưng', address: 'Quận 1, TP.HCM', isHead: true },
    { name: 'F Bắc Giang', address: 'Bắc Giang' },
    { name: 'F Bắc Ninh', address: 'Bắc Ninh' },
    { name: 'F Nam Định', address: 'Nam Định' },
    { name: 'T Ngô Xuân Quảng', address: 'Gia Lâm, Hà Nội' },
    { name: 'T Ngọc Hồi', address: 'Thanh Trì, Hà Nội' },
    { name: 'T Ngọc Lâm', address: 'Long Biên, Hà Nội' },
    { name: 'T Nguyễn Hoàng', address: 'Nam Từ Liêm, Hà Nội' },
    { name: 'T Nguyễn Văn Lộc', address: 'Hà Đông, Hà Nội' },
    { name: 'Cửa hàng Quận 7', address: 'Phú Mỹ Hưng, Quận 7' },
  ];

  const workLocationRepo = dataSource.getRepository(WorkLocation);

  // Chuyển đổi dữ liệu thô sang định dạng Entity
  const locationsToSave = locationsData.map((loc) => ({
    companyId: companyId,
    locationName: loc.name,
    address: loc.address || 'Đang cập nhật',
    isHeadOffice: loc.isHead || false,
    status: 'ACTIVE',
  }));

  const savedLocations = await workLocationRepo.save(locationsToSave);

  console.log(`Đã lưu thành công ${savedLocations.length} địa điểm làm việc.`);

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
  ]);

  const shiftsData = [
    {
      code: '7617681822219587098',
      name: 'Ca hanh chinh 1',
      start: '08:00',
      end: '17:00',
      hours: 8,
      late: 1,
      early: 1,
      restId: 1,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617686815940365847',
      name: 'Ca hanh chinh 2',
      start: '08:30',
      end: '17:30',
      hours: 8,
      late: 1,
      early: 1,
      restId: 1,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617682250839723546',
      name: 'Ca thai san 1',
      start: '09:00',
      end: '17:00',
      hours: 7,
      late: 1,
      early: 1,
      restId: 1,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617682373005577752',
      name: 'Ca thai san 2',
      start: '08:00',
      end: '17:00',
      hours: 7,
      late: 1,
      early: 1,
      restId: 2,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617682487157722647',
      name: 'Ca thai san 3',
      start: '08:00',
      end: '17:00',
      hours: 7,
      late: 1,
      early: 1,
      restId: 3,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617682625448168986',
      name: 'Ca thai san 4',
      start: '08:00',
      end: '16:00',
      hours: 7,
      late: 1,
      early: 1,
      restId: 1,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617682773432405527',
      name: 'Ca thai san 5',
      start: '08:30',
      end: '17:00',
      hours: 7,
      late: 1,
      early: 1,
      restId: 4,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617683974790942231',
      name: 'Ca thai san 6',
      start: '08:30',
      end: '17:00',
      hours: 7,
      late: 1,
      early: 1,
      restId: 5,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617684273964781080',
      name: 'Ca thai san 7',
      start: '08:30',
      end: '16:30',
      hours: 7,
      late: 1,
      early: 1,
      restId: 1,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617684657173171736',
      name: 'Ca thai san 8',
      start: '08:00',
      end: '17:00',
      hours: 7,
      late: 1,
      early: 1,
      restId: 6,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617684839291555351',
      name: 'Ca thai san 9',
      start: '08:00',
      end: '16:30',
      hours: 7,
      late: 1,
      early: 1,
      restId: 4,
      originId: 'LMONNKZO7X5',
    },
    {
      code: '17617684959968415256',
      name: 'Ca thai san 10',
      start: '08:00',
      end: '16:30',
      hours: 7,
      late: 1,
      early: 1,
      restId: 5,
      originId: 'LMONNKZO7X5',
    },
    {
      code: 'Cacuahang1',
      name: 'Ca cua hang 1',
      start: '08:00',
      end: '09:00',
      hours: 1,
      late: 1,
      early: 1,
      restId: null,
      originId: 'LMONNKZO7X5',
    },
    {
      code: 'Cacuahang2',
      name: 'Ca cua hang 2',
      start: '09:00',
      end: '12:00',
      hours: 3,
      late: 1,
      early: 1,
      restId: null,
      originId: 'LMONNKZO7X5',
    },
    {
      code: 'Cacuahang3',
      name: 'Ca cua hang 3',
      start: '12:00',
      end: '15:00',
      hours: 3,
      late: 1,
      early: 1,
      restId: null,
      originId: 'LMONNKZO7X5',
    },
    {
      code: 'Cacuahang4',
      name: 'Ca cua hang 4',
      start: '15:00',
      end: '18:00',
      hours: 3,
      late: 1,
      early: 1,
      restId: null,
      originId: 'LMONNKZO7X5',
    },
    {
      code: 'Cacuahang5',
      name: 'Ca cua hang 5',
      start: '18:00',
      end: '21:00',
      hours: 3,
      late: 1,
      early: 1,
      restId: null,
      originId: 'LMONNKZO7X5',
    },
    {
      code: 'Cacuahang6',
      name: 'Ca cua hang 6',
      start: '21:00',
      end: '22:00',
      hours: 1,
      late: 1,
      early: 1,
      restId: null,
      originId: 'LMONNKZO7X5',
    },
  ];

  const restRulesMapping = {
    1: { start: '12:00', end: '13:00' },
    2: { start: '11:00', end: '13:00' },
    3: { start: '12:00', end: '14:00' },
    4: { start: '11:30', end: '13:00' },
    5: { start: '12:00', end: '13:30' },
    6: { start: '11:30', end: '13:30' },
  };

  const groupsData = [
    {
      code: '7617676707973074458',
      name: 'Ca Văn Phòng 1',
      shiftCode: '7617681822219587098',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617681982959554072',
      name: 'Ca Văn Phòng 2',
      shiftCode: '17617686815940365847',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617687309982371354',
      name: 'Ca thai sản 1',
      shiftCode: '17617682250839723546',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617689477007330840',
      name: 'Ca thai sản 2',
      shiftCode: '17617682373005577752',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617689963334307352',
      name: 'Ca thai sản 3',
      shiftCode: '17617682487157722647',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617690605853871642',
      name: 'Ca thai sản 4',
      shiftCode: '17617682625448168986',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617691029176651290',
      name: 'Ca thai sản 5',
      shiftCode: '17617682773432405527',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617691935276322327',
      name: 'Ca thai sản 6',
      shiftCode: '17617683974790942231',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617692580343500311',
      name: 'Ca thai sản 7',
      shiftCode: '17617684273964781080',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617694472352042522',
      name: 'Ca thai sản 8',
      shiftCode: '17617684657173171736',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617694808810753559',
      name: 'Ca thai sản 9',
      shiftCode: '17617684839291555351',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617695144120159768',
      name: 'Ca thai sản 10',
      shiftCode: '17617684959968415256',
      originId: 'LMONNKZO7X5',
    },
    {
      code: '7617745162118123031',
      name: 'Ca cửa hàng',
      shiftCode: 'Cacuahang1',
      originId: 'LMONNKZO7X5',
      allShiftCodes: ['7617681822219587098', '17617686815940365847'],
    },
  ];

  const shiftRepo = dataSource.getRepository(Shift);
  const restRepo = dataSource.getRepository(ShiftRestRule);
  const attendanceGroupRepo = dataSource.getRepository(AttendanceGroup);

  // Khai báo mảng chứa kết quả ở ngoài để các vòng lặp sau có thể sử dụng
  const savedShifts: Shift[] = [];
  const restIdToDbEntityMap = new Map<number, ShiftRestRule>();

  // --- PHẦN 1: LƯU REST RULES ---
  for (const [key, rule] of Object.entries(restRulesMapping)) {
    const savedRule = await restRepo.save({
      restBeginTime: `${rule.start}:00`,
      restEndTime: `${rule.end}:00`,
    });
    restIdToDbEntityMap.set(Number(key), savedRule);
    console.log(`--- Đã lưu Rest Rule: ${rule.start} - ${rule.end} ---`);
  }

  // --- PHẦN 2: LƯU SHIFTS ---
  for (const s of shiftsData) {
    const assignedRestRule = s.restId
      ? restIdToDbEntityMap.get(s.restId)
      : undefined;

    // Dùng .create() để TypeScript không báo lỗi Overload
    const newShift = shiftRepo.create({
      companyId: companyId,
      code: s.code,
      originId: s.code,
      shiftName: s.name,
      startTime: new Date(`2026-01-01T${s.start}:00+07:00`),
      endTime: new Date(`2026-01-01T${s.end}:00+07:00`),
      shiftHours: s.hours,
      allowLateMinutes: s.late,
      allowEarlyMinutes: s.early,
      restRule: assignedRestRule ?? undefined, // Chuyển null thành undefined
    });

    const saved = await shiftRepo.save(newShift);
    savedShifts.push(saved); // Lưu vào mảng để tí nữa dùng cho Group
    console.log(`--- Đã lưu Shift: ${s.name} ---`);
  }

  // --- PHẦN 3: LƯU GROUPS ---
  const savedGroups: AttendanceGroup[] = [];

  for (const g of groupsData) {
    // Bây giờ 'savedShifts' đã có dữ liệu để tìm kiếm
    const defaultShift = savedShifts.find((s) => s.code === g.shiftCode);
    let relatedShifts: Shift[] = [];

    if (g.shiftCode === 'Cacuahang1') {
      relatedShifts = savedShifts.filter((s) => s.code.startsWith('Cacuahang'));
    } else {
      // Các nhóm khác chỉ lấy chính ca mặc định của nó
      relatedShifts = defaultShift ? [defaultShift] : [];
    }
    const groupEntity = attendanceGroupRepo.create({
      companyId: companyId,
      originId: g.code,
      code: g.code,
      groupName: g.name,
      // Gán ID nếu tìm thấy, không thì undefined
      defaultShiftId: defaultShift?.id ?? undefined,
      shifts: relatedShifts,
      status: 'ACTIVE',
    });

    const group = await attendanceGroupRepo.save(groupEntity);
    savedGroups.push(group);
  }

  console.log(`--- Đã import xong ${savedGroups.length} nhóm chấm công ---`);

  const holidayRepo = dataSource.getRepository(Holiday);

  const parseVNCardDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const holidaysData = [
    { name: 'Tết Dương lịch', date: '01/01/2026', type: 'PUBLIC', value: 1.0 },
    { name: 'Tết Nguyên đán', date: '17/02/2026', type: 'PUBLIC', value: 1.0 },
    { name: 'NKT VN', date: '18/04/2026', type: 'ANGEL', value: 1.0 }, // Map "Nghỉ lễ Angel" -> ANGEL
    { name: 'Du lịch', date: '20/03/2026', type: 'SPECIAL', value: 1.0 }, // Map "Nghỉ đặc biệt" -> SPECIAL
  ];

  for (const h of holidaysData) {
    await holidayRepo.save({
      companyId: companyId,
      holiday_name: h.name,
      holiday_date: parseVNCardDate(h.date),
      holiday_type: h.type as any,
      workday_value: h.value,
      is_active: true,
    });
  }

  console.log(
    `--- Đã import thành công ${holidaysData.length} ngày lễ cho công ty ---`,
  );
  // ──────────────────────────────────────────────
  // 7. EMPLOYEE – đa dạng mọi trường hợp
  // ──────────────────────────────────────────────

  const employeeRepo = dataSource.getRepository(Employee);

  // Lấy các dữ liệu tham chiếu
  const empGroup = savedGroups.find((g) => g.code === '7617676707973074458');

  // workLocations không có field isHeadOffice, ta tìm theo tên
  const workLocationOffice = savedLocations.find((l) => l.locationName && !l.locationName.includes('Cửa hàng')) || savedLocations[0];
  const workLocationStore = savedLocations.find((l) => l.locationName && l.locationName.includes('Cửa hàng')) || savedLocations[0];

  const departments = await dataSource.getRepository(Department).find({ where: { companyId } });
  const deptOffice = departments.find(d => d.departmentCode === 'P_BACKEND') || departments[0];
  const deptStore = departments.find(d => d.departmentCode === 'P_STORE') || departments[0];

  const testCases = [
    {
      id: '1001',
      userName: 'vp_chuan',
      fullName: 'NV VP Đi Chuẩn',
      groupCode: '7617676707973074458', // Ca VP 1
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1002',
      userName: 'vp_dimuon',
      fullName: 'NV VP Đi Muộn',
      groupCode: '7617676707973074458',
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1003',
      userName: 'vp_vesom',
      fullName: 'NV VP Về Sớm',
      groupCode: '7617676707973074458',
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1004',
      userName: 'vp_quen_cham',
      fullName: 'NV VP Quên Chấm Công',
      groupCode: '7617676707973074458',
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1005',
      userName: 'ts_muon_1h',
      fullName: 'NV Thai Sản Đi Muộn 1h',
      groupCode: '7617687309982371354', // Ca thai sản 1
      isMaternity: true,
      isStore: false,
    },
    {
      id: '1006',
      userName: 'ts_ve_som_1h',
      fullName: 'NV Thai Sản Về Sớm 1h',
      groupCode: '7617689477007330840', // Ca thai sản 2
      isMaternity: true,
      isStore: false,
    },
    {
      id: '1007',
      userName: 'ch_ca_sang',
      fullName: 'NV Cửa Hàng Ca Sáng',
      groupCode: '7617745162118123031', // Ca cửa hàng
      isMaternity: false,
      isStore: true,
    },
    {
      id: '1008',
      userName: 'ch_ca_chieu',
      fullName: 'NV Cửa Hàng Ca Chiều',
      groupCode: '7617745162118123031', // Ca cửa hàng
      isMaternity: false,
      isStore: true,
    },
    {
      id: '1009',
      userName: 'ch_xoay_ca',
      fullName: 'NV Cửa Hàng Xoay Ca',
      groupCode: '7617745162118123031', // Ca cửa hàng
      isMaternity: false,
      isStore: true,
    },
    {
      id: '1010',
      userName: 'vp_parttime',
      fullName: 'NV VP Part-time',
      groupCode: '7617676707973074458', // Ca VP 1
      isPartTime: true,
      isMaternity: false,
      isStore: false,
    },
    {
      id: '1011',
      userName: 'vp_t7_off',
      fullName: 'NV VP Nghỉ Thứ 7',
      groupCode: '7617676707973074458', // Ca VP 1
      isSaturdayOff: true,
      isMaternity: false,
      isStore: false,
    },
  ];

  const employees: Employee[] = [];

  for (const tc of testCases) {
    const isFemale = tc.isMaternity ? true : faker.datatype.boolean();
    const joinedAt = faker.date.past({ years: 4 });
    const selectedGroup = savedGroups.find((g) => g.code === tc.groupCode) || empGroup;

    let empType = empTypes.find((t) => t.code === 'OFFICIAL')!;
    if (tc.isPartTime) empType = empTypes.find((t) => t.code === 'PART_TIME')!;
    if (tc.isStore) empType = empTypes.find((t) => t.code === 'SHIFT_WORKER')!;

    employees.push(employeeRepo.create({
      companyId,
      userId: tc.id,
      originId: `604465_${tc.id}`,
      userName: tc.userName,
      fullName: tc.fullName,
      email: `${tc.userName}@upbase.global`,
      phoneNumber: faker.phone.number(),
      gender: isFemale ? 'FEMALE' : 'MALE',
      birthday: faker.date.birthdate({ min: 22, max: 48, mode: 'age' }),
      joinedAt,
      resignedAt: null,
      workLocation: tc.isStore ? workLocationStore : workLocationOffice,
      departments: [tc.isStore ? deptStore : deptOffice],
      attendanceGroup: selectedGroup,
      jobLevel: randomFromArray(jobLevels),
      employeeType: empType,
      employeeStatus: empStatuses.find((s) => s.code === 'WORKING') || empStatuses[0],
      attendanceMethod: attMethods.find(m => m.code === 'TIME_MACHINE') || attMethods[0],
      is_saturday_off: !!tc.isSaturdayOff,
      is_angel: false,
      is_maternity_shift: !!tc.isMaternity,
      leavePolicy: leavePolicy,
      larkId: `lark_${tc.id}`,
    }));
  }

  const savedEmployees = await employeeRepo.save(employees);
  console.log(`--- Đã seed thành công ${savedEmployees.length} nhân viên test cases ---`);

  // ──────────────────────────────────────────────
  // 8. SHIFT ASSIGNMENT – Cho nhân viên phân ca cửa hàng
  // ──────────────────────────────────────────────
  const shiftAssignmentRepo = dataSource.getRepository(ShiftAssignment);
  const shiftAssignmentsData: ShiftAssignment[] = [];

  // Dùng luôn các ca cửa hàng có sẵn
  const caCuaHang2 = savedShifts.find(s => s.code === 'Cacuahang2'); // 09:00 - 12:00
  const caCuaHang4 = savedShifts.find(s => s.code === 'Cacuahang4'); // 15:00 - 18:00
  const caCuaHang5 = savedShifts.find(s => s.code === 'Cacuahang5'); // 18:00 - 21:00

  // Fix cứng ngày phân ca là 11/02/2026
  const targetYear = 2026;
  const targetMonth = 1; // 0-indexed, 1 = Tháng 2
  const targetDay = 11;
  const assignDate = new Date(Date.UTC(targetYear, targetMonth, targetDay));

  for (const emp of savedEmployees) {
    if (!emp.userName.startsWith('ch_')) continue;

    let shiftToAssign: Shift | undefined = undefined;
    if (emp.userName === 'ch_ca_sang' && caCuaHang2) {
      shiftToAssign = caCuaHang2;
    } else if (emp.userName === 'ch_ca_chieu' && caCuaHang5) {
      shiftToAssign = caCuaHang5;
    } else if (emp.userName === 'ch_xoay_ca') {
      const isWeekend = assignDate.getUTCDay() === 0 || assignDate.getUTCDay() === 6;
      shiftToAssign = isWeekend && caCuaHang4 ? caCuaHang4 : caCuaHang2;
    }

    if (shiftToAssign) {
      shiftAssignmentsData.push(shiftAssignmentRepo.create({
        companyId,
        employeeId: emp.id,
        storeId: workLocationStore.id,
        date: assignDate,
        shiftId: shiftToAssign.id,
        onTime: new Date(Date.UTC(targetYear, targetMonth, targetDay, shiftToAssign.startTime.getUTCHours(), shiftToAssign.startTime.getUTCMinutes(), 0)),
        offTime: new Date(Date.UTC(targetYear, targetMonth, targetDay, shiftToAssign.endTime.getUTCHours(), shiftToAssign.endTime.getUTCMinutes(), 0)),
        isActive: true
      }));
    }
  }

  if (shiftAssignmentsData.length > 0) {
    await shiftAssignmentRepo.save(shiftAssignmentsData);
    console.log(`--- Đã seed thành công ${shiftAssignmentsData.length} phân ca (Shift Assignments) ---`);
  }

  console.log('✅ Hoàn thành seed dữ liệu – đầy đủ các trường hợp nghiệp vụ');
};
