import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AttendanceRequest,
  RequestType,
} from './entities/attendance-request.entity';
import { RequestDetailTimeOff } from './entities/request-detail-time-off.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { LeaveType } from '../master-data/entities/leave-type.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from 'src/constants';

@Injectable()
export class LeaveManagementService {
  private readonly logger = new Logger(LeaveManagementService.name);

  constructor(
    private dataSource: DataSource,

    @InjectQueue(QUEUE_NAMES.CALCULATE_DAILY)
    private attendanceQueue: Queue,
  ) {}

  async importFromExternalSource(payload: any, companyId: string) {
    this.logger.log(`>>> BẮT ĐẦU IMPORT: companyId=${companyId}`);

    const items = payload?.data?.items || [];
    this.logger.log(`>>> Số lượng bản ghi nhận được: ${items.length}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of items) {
        const { record_id, fields } = item;
        this.logger.log(`--- Đang xử lý record_id: ${record_id} ---`);

        // 1. Lấy userId từ JSON
        const externalUserId = fields['Người lập phiếu']?.[0]?.id;
        const leaveTypeName = fields['Chi tiết loại nghỉ'];
        this.logger.log(
          `Dữ liệu từ JSON: userId=${externalUserId}, leaveType=${leaveTypeName}`,
        );

        // 2. Query tìm Employee
        const employee = await queryRunner.manager.findOne(Employee, {
          where: { userId: externalUserId, companyId: companyId },
        });

        if (!employee) {
          this.logger.warn(
            `!!! THẤT BẠI: Không tìm thấy Employee với userId ${externalUserId} và companyId ${companyId}`,
          );
          continue;
        }
        this.logger.log(`Thành công: Tìm thấy Employee ID=${employee.id}`);

        // 3. Tìm LeaveType
        const leaveType = await queryRunner.manager.findOne(LeaveType, {
          where: { leaveTypeName: leaveTypeName, companyId: companyId },
        });
        this.logger.log(`LeaveType tìm thấy: ${leaveType?.id || 'NULL'}`);

        // 4. Khởi tạo/Cập nhật AttendanceRequest
        let request = await queryRunner.manager.findOne(AttendanceRequest, {
          where: { record_id: record_id },
        });

        if (!request) {
          this.logger.log(`Tạo mới AttendanceRequest`);
          request = new AttendanceRequest();
          request.record_id = record_id;
        } else {
          this.logger.log(`Cập nhật AttendanceRequest cũ: ${request.id}`);
        }

        const startTime = new Date(fields['Thời gian bắt đầu']);

        request.request_id = fields['Mã đơn']?.[0]?.text;
        request.employee_id = employee.id;
        request.company_id = companyId;
        request.status = fields['Trạng thái duyệt'];
        request.note = leaveTypeName;
        request.type = RequestType.LEAVE;
        request.applied_date = startTime;
        request.total_hours = fields['Số giờ nghỉ'];
        request.leave_type_id = leaveType?.id || null;
        request.raw_data = item;

        const savedRequest = await queryRunner.manager.save(request);
        this.logger.log(`Đã SAVE AttendanceRequest: ID=${savedRequest.id}`);

        const date = new Date(fields['Thời gian bắt đầu']);

        await this.attendanceQueue.add(
          JOB_NAMES.CALCULATE_DAILY,
          {
            employee_id: employee.id,
            date: date,
          },
          {
            jobId: `calc-${employee.id}-${date.toISOString().split('T')[0]}`,
            removeOnComplete: true,
          },
        );

        // 5. Khởi tạo/Cập nhật RequestDetailTimeOff
        let detail = await queryRunner.manager.findOne(RequestDetailTimeOff, {
          where: { attendance_request_id: savedRequest.id },
        });

        if (!detail) {
          this.logger.log(`Tạo mới Detail`);
          detail = new RequestDetailTimeOff();
          detail.attendance_request_id = savedRequest.id;
        }

        detail.start_time = startTime;
        detail.end_time = new Date(fields['Thời gian kết thúc']);
        detail.hours = fields['Số giờ nghỉ'];
        detail.leave_type_details = leaveTypeName;
        detail.leave_type_id = leaveType?.id || null;

        await queryRunner.manager.save(detail);
        this.logger.log(`Đã SAVE RequestDetailTimeOff thành công.`);
      }

      this.logger.log(`>>> CHUẨN BỊ COMMIT TRANSACTION....`);
      await queryRunner.commitTransaction();
      this.logger.log(`>>> TRANSACTION DONE!`);

      return { success: true, message: `Successfully processed items.` };
    } catch (error) {
      this.logger.error(
        '!!! LỖI TRONG QUÁ TRÌNH XỬ LÝ - ROLLBACK NGAY LẬP TỨC',
      );
      await queryRunner.rollbackTransaction();
      this.logger.error('Chi tiết lỗi:', error.stack);
      throw error;
    } finally {
      this.logger.log(`>>> GIẢI PHÓNG QUERY RUNNER`);
      await queryRunner.release();
    }
  }
}
