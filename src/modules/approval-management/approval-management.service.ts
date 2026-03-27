import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AttendanceRequest, RequestType } from './entities/attendance-request.entity';
import { RequestDetailTimeOff } from './entities/request-detail-time-off.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { LeaveType } from '../master-data/entities/leave-type.entity';
import { AttendanceEngine } from '../attendance/engine/attendance.engine';
import { RequestDetailOvertime } from './entities/request-detail-overtime.entity';
import { RequestDetailAdjustment } from './entities/request-detail-adjustment.entity';
import { ExternalApprovalPayloadDto, ExternalApprovalProcess } from './dto/external-approval.dto';

@Injectable()
export class ApprovalManagementService {
  private readonly logger = new Logger(ApprovalManagementService.name);

  constructor(
    private dataSource: DataSource,
    private attendanceEngine: AttendanceEngine,
  ) { }

  async importFromExternalSource(payload: ExternalApprovalPayloadDto, companyId: string) {
    this.logger.log(`>>> BẮT ĐẦU IMPORT: companyId=${companyId}`);

    const items = payload?.data?.items || [];
    this.logger.log(`>>> Số lượng bản ghi nhận được: ${items.length}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Dùng Map để tránh trùng lặp task (Key: employeeId_YYYY-MM-DD)
    const taskMap = new Map<string, { employeeId: string; date: Date }>();
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as { record_id: string; message: string }[]
    };

    try {
      for (const item of items) {
        const { record_id, fields } = item;
        const approvalProcess = fields.approval_process;

        this.logger.log(`--- Đang xử lý record_id: ${record_id} ---`);

        const externalUserId = fields.requester?.[0]?.id;
        const leaveTypeName = fields.leave_type_detail;

        const employee = await queryRunner.manager.findOne(Employee, {
          where: { userId: externalUserId, companyId: companyId },
        });

        if (!employee) {
          const errMsg = `Không tìm thấy Employee với userId ${externalUserId}`;
          this.logger.warn(`!!! THẤT BẠI: ${errMsg}`);
          results.failureCount++;
          results.errors.push({ record_id, message: errMsg });
          continue;
        }

        // Xác định loại đơn
        let type = RequestType.LEAVE;
        if (approvalProcess === ExternalApprovalProcess.REMOTE) type = RequestType.REMOTE;
        else if (approvalProcess === ExternalApprovalProcess.OVERTIME) type = RequestType.OVERTIME;
        else if (approvalProcess === ExternalApprovalProcess.CORRECTION) type = RequestType.CORRECTION;
        else if (approvalProcess === ExternalApprovalProcess.MATERNITY) type = RequestType.MATERNITY;
        else if (approvalProcess === ExternalApprovalProcess.SWAP) type = RequestType.SWAP;

        const leaveType = await queryRunner.manager.findOne(LeaveType, {
          where: { leaveTypeName: leaveTypeName, companyId: companyId },
        });

        let request = await queryRunner.manager.findOne(AttendanceRequest, {
          where: { record_id: record_id },
        });

        const oldStatus = request?.status?.toLowerCase();

        if (!request) {
          request = new AttendanceRequest();
          request.record_id = record_id;
        }

        const startTime = this.parseTimestamp(fields.start_time);
        const endTime = this.parseTimestamp(fields.end_time);

        const newStatus = fields.status;
        const isApproved = newStatus?.toLowerCase() === 'approved';
        const wasApproved = oldStatus === 'approved';
        const isRejected = newStatus?.toLowerCase() === 'rejected';

        request.request_id = fields.request_code?.[0]?.text || '';
        request.employee_id = employee.id;
        request.company_id = companyId;
        request.status = newStatus || '';
        request.note = leaveTypeName || fields.note || '';
        request.type = type; // Fix: Gán đúng type đã phân loại
        request.applied_date = startTime;
        request.total_hours = fields.total_hours || 0;
        request.leave_type_id = leaveType?.id || null;
        request.is_counted = isApproved; // Chỉ tính công nếu Đã duyệt
        request.raw_data = item;

        const savedRequest = await queryRunner.manager.save(request);

        // 5. XỬ LÝ LƯU BẢNG DETAIL TƯƠNG ỨNG
        if (type === RequestType.LEAVE || type === RequestType.REMOTE) {
          let detail = await queryRunner.manager.findOne(RequestDetailTimeOff, {
            where: { attendance_request_id: savedRequest.id },
          });
          if (!detail) detail = new RequestDetailTimeOff();
          detail.attendance_request_id = savedRequest.id;
          detail.start_time = startTime;
          detail.end_time = endTime;
          detail.hours = savedRequest.total_hours;
          detail.leave_type_id = savedRequest.leave_type_id;
          detail.leave_type_details = leaveTypeName || (type === RequestType.REMOTE ? 'Remote Work' : '');
          await queryRunner.manager.save(detail);
        }
        else if (type === RequestType.OVERTIME) {
          let otDetail = await queryRunner.manager.findOne(RequestDetailOvertime, {
            where: { attendance_request_id: savedRequest.id },
          });
          if (!otDetail) otDetail = new RequestDetailOvertime();
          otDetail.attendance_request_id = savedRequest.id;
          otDetail.start_time = startTime;
          otDetail.end_time = endTime;
          otDetail.hours_ratio = savedRequest.total_hours;
          await queryRunner.manager.save(otDetail);
        }
        else if (type === RequestType.CORRECTION || type === RequestType.MATERNITY || type === RequestType.SWAP) {
          let adjDetail = await queryRunner.manager.findOne(RequestDetailAdjustment, {
            where: { attendance_request_id: savedRequest.id },
          });
          if (!adjDetail) adjDetail = new RequestDetailAdjustment();
          adjDetail.attendance_request_id = savedRequest.id;

          if (type === RequestType.CORRECTION) {
            adjDetail.replenishment_time = startTime;
          } else if (type === RequestType.MATERNITY) {
            adjDetail.maternity_start_date = startTime;
            adjDetail.maternity_end_date = endTime;
            adjDetail.maternity_shift = fields.maternity_shift || '';
          } else if (type === RequestType.SWAP) {
            adjDetail.date_original_shift = startTime; // Giả sử startTime là ngày gốc
            adjDetail.date_swap_shift = fields.swap_date ? new Date(fields.swap_date) : endTime;
            adjDetail.employee_id_swap = fields.swap_with_employee?.[0]?.id || '';
          }

          await queryRunner.manager.save(adjDetail);
        }

        // Gom danh sách ngày cần tính toán lại (Xử lý cả nghỉ nhiều ngày)
        // Chỉ tính lại nếu:
        // 1. Đơn mới là Approved
        // 2. Đơn cũ là Approved nhưng đơn mới là Rejected (để tính toán lại bỏ phép)
        if (isApproved || (isRejected && wasApproved)) {
          const today = new Date();
          today.setHours(23, 59, 59, 999);

          let tempDate = new Date(startTime);
          // Chạy vòng lặp từ ngày bắt đầu đến ngày kết thúc
          while (tempDate <= endTime) {
            if (tempDate <= today) {
              const dateStr = tempDate.toISOString().split('T')[0];
              const key = `${employee.id}_${dateStr}`;
              if (!taskMap.has(key)) {
                taskMap.set(key, { employeeId: employee.id, date: new Date(tempDate) });
              }
            }
            // Tăng thêm 1 ngày
            tempDate.setDate(tempDate.getDate() + 1);
          }
        }

        results.successCount++;
      }

      this.logger.log(`>>> CHUẨN BỊ COMMIT TRANSACTION....`);
      await queryRunner.commitTransaction();
      this.logger.log(`>>> TRANSACTION DONE!`);

      // 6. BẮN LỆNH TÍNH TOÁN NGẦM (Fire and Forget)
      const tasksToRecalc = Array.from(taskMap.values());
      tasksToRecalc.forEach(task => {
        this.attendanceEngine.calculateDailyForEmployee(task.employeeId, task.date)
          .then(() => {
            this.logger.log(`[SYNC CALC DONE] Employee ${task.employeeId} on ${task.date.toISOString().split('T')[0]}`);
          })
          .catch(err => {
            this.logger.error(`[SYNC CALC ERROR] Failed for ${task.employeeId}: ${err.message}`);
          });
      });

      return {
        success: results.failureCount === 0,
        message: `Processed ${items.length} items: ${results.successCount} succeeded, ${results.failureCount} failed.`,
        data: results
      };

    } catch (error) {
      this.logger.error('!!! LỖI TRONG QUÁ TRÌNH XỬ LÝ - ROLLBACK');
      await queryRunner.rollbackTransaction();
      this.logger.error(error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private parseTimestamp = (time: any) => {
    if (typeof time === 'string' && !isNaN(Number(time))) {
      return new Date(Number(time) * 1000);
    } return new Date(time);
  };
}