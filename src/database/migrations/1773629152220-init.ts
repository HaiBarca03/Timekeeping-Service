import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1773629152220 implements MigrationInterface {
    name = 'Init1773629152220'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" ADD "work_hours_redundant" double precision NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_timesheets" DROP COLUMN "work_hours_redundant"`);
    }

}
