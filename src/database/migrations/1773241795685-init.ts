import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1773241795685 implements MigrationInterface {
    name = 'Init1773241795685'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_punches" ADD "check_in_actual" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_punches" ADD "check_out_actual" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "attendance_daily_punches" DROP COLUMN "check_out_actual"`);
        await queryRunner.query(`ALTER TABLE "attendance_daily_punches" DROP COLUMN "check_in_actual"`);
    }

}
