import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AttendanceRequest, RequestType } from './entities/attendance-request.entity';
import { RequestDetailTimeOff } from './entities/request-detail-time-off.entity';
import { Employee } from '../master-data/entities/employee.entity';
import { LeaveType } from '../master-data/entities/leave-type.entity';
import { AttendanceEngine } from '../attendance/engine/attendance.engine';
import { RequestDetailOvertime } from './entities/request-detail-overtime.entity';
import { RequestDetailAdjustment } from './entities/request-detail-adjustment.entity';

@Injectable()
export class ApprovalManagementService {
  private readonly logger = new Logger(ApprovalManagementService.name);

  constructor(
    private dataSource: DataSource,
    private attendanceEngine: AttendanceEngine,
  ) { }

  async importFromExternalSource(payload: any, companyId: string) {
    this.logger.log(`>>> BẮT ĐẦU IMPORT: companyId=${companyId}`);

    const items = payload?.data?.items || [];
    this.logger.log(`>>> Số lượng bản ghi nhận được: ${items.length}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Dùng Map để tránh trùng lặp task (Key: employeeId_YYYY-MM-DD)
    const taskMap = new Map<string, { employeeId: string; date: Date }>();

    try {
      for (const item of items) {
        const { record_id, fields } = item;
        // Fix: Lấy approvalProcess từ đúng vị trí trong item
        const approvalProcess = fields['Loại đơn'] || fields['Approval process'] || '';

        this.logger.log(`--- Đang xử lý record_id: ${record_id} ---`);

        const externalUserId = fields['Người lập phiếu']?.[0]?.id;
        const leaveTypeName = fields['Chi tiết loại nghỉ'];

        const employee = await queryRunner.manager.findOne(Employee, {
          where: { userId: externalUserId, companyId: companyId },
        });

        if (!employee) {
          this.logger.warn(`!!! THẤT BẠI: Không tìm thấy Employee với userId ${externalUserId}`);
          continue;
        }

        // Xác định loại đơn
        let type = RequestType.LEAVE;
        const processStr = String(approvalProcess).toLowerCase();
        if (processStr.includes('tăng ca')) type = RequestType.OVERTIME;
        else if (processStr.includes('điều chỉnh')) type = RequestType.CORRECTION;

        const leaveType = await queryRunner.manager.findOne(LeaveType, {
          where: { leaveTypeName: leaveTypeName, companyId: companyId },
        });
        console.log('leaveType', leaveType)
        let request = await queryRunner.manager.findOne(AttendanceRequest, {
          where: { record_id: record_id },
        });

        if (!request) {
          request = new AttendanceRequest();
          request.record_id = record_id;
        }

        const startTime = new Date(fields['Thời gian bắt đầu']);
        const endTime = new Date(fields['Thời gian kết thúc']);

        request.request_id = fields['Mã đơn']?.[0]?.text;
        request.employee_id = employee.id;
        request.company_id = companyId;
        request.status = fields['Trạng thái duyệt'];
        request.note = leaveTypeName;
        request.type = type; // Fix: Gán đúng type đã phân loại
        request.applied_date = startTime;
        request.total_hours = fields['Số giờ nghỉ'];
        request.leave_type_id = leaveType?.id || null;
        request.is_counted = true; // Gán cứng true để đảm bảo luôn được tính
        request.raw_data = item;

        const savedRequest = await queryRunner.manager.save(request);

        // 5. XỬ LÝ LƯU BẢNG DETAIL TƯƠNG ỨNG
        if (type === RequestType.LEAVE) {
          let detail = await queryRunner.manager.findOne(RequestDetailTimeOff, {
            where: { attendance_request_id: savedRequest.id },
          });
          if (!detail) detail = new RequestDetailTimeOff();
          detail.attendance_request_id = savedRequest.id;
          detail.start_time = startTime;
          detail.end_time = endTime;
          detail.hours = savedRequest.total_hours;
          detail.leave_type_id = savedRequest.leave_type_id;
          detail.leave_type_details = leaveTypeName;
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
          otDetail.ot_rule_id = 1;
          otDetail.hours_ratio = savedRequest.total_hours;
          await queryRunner.manager.save(otDetail);
        }
        else if (type === RequestType.CORRECTION) {
          let adjDetail = await queryRunner.manager.findOne(RequestDetailAdjustment, {
            where: { attendance_request_id: savedRequest.id },
          });
          if (!adjDetail) adjDetail = new RequestDetailAdjustment();
          adjDetail.attendance_request_id = savedRequest.id;
          adjDetail.replenishment_time = startTime;
          await queryRunner.manager.save(adjDetail);
        }

        // Gom danh sách ngày cần tính toán lại (Xử lý cả nghỉ nhiều ngày)
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

      return { success: true, message: `Successfully processed ${items.length} items.` };

    } catch (error) {
      this.logger.error('!!! LỖI TRONG QUÁ TRÌNH XỬ LÝ - ROLLBACK');
      await queryRunner.rollbackTransaction();
      this.logger.error(error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}