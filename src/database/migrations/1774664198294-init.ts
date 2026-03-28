import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774664198294 implements MigrationInterface {
    name = 'Init1774664198294'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "in_out_work_hours" numeric(6,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "in_out_workday_count" numeric(6,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "in_out_work_hours" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "in_out_workday_count" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" DROP COLUMN "original_record"`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" ADD "original_record" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" DROP COLUMN "original_record"`);
        await queryRunner.query(`ALTER TABLE "request_detail_adjustment" ADD "original_record" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "in_out_workday_count"`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "in_out_work_hours"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "in_out_workday_count"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "in_out_work_hours"`);
    }

}
