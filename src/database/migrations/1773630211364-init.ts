import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1773630211364 implements MigrationInterface {
    name = 'Init1773630211364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "total_standard_hours"`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "total_leave_hours"`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "total_adjustment_hours"`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "total_paid_days" numeric(10,3) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "last_sync_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_work_days" TYPE numeric(10,3)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_work_hours" TYPE numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_ot_hours" TYPE numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_leave_days" TYPE numeric(10,3)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_remote_days" TYPE numeric(10,3)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "confirmation_status" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "confirmation_status" SET DEFAULT 'pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "confirmation_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "confirmation_status" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_remote_days" TYPE numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_leave_days" TYPE numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_ot_hours" TYPE numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_work_hours" TYPE numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ALTER COLUMN "total_work_days" TYPE numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "last_sync_at"`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "total_paid_days"`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "total_adjustment_hours" numeric(8,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "total_leave_hours" numeric(8,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "total_standard_hours" numeric(8,2) NOT NULL DEFAULT '0'`);
    }

}
