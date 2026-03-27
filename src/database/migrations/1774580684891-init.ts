import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774580684891 implements MigrationInterface {
    name = 'Init1774580684891'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "workday_count" numeric(6,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" ADD "workday_count" numeric(10,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_monthly_timesheets" DROP COLUMN "workday_count"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "workday_count"`);
    }

}
