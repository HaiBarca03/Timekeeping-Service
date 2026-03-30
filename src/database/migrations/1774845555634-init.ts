import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774845555634 implements MigrationInterface {
    name = 'Init1774845555634'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holidays" DROP COLUMN "holiday_type"`);
        await queryRunner.query(`DROP TYPE "public"."holidays_holiday_type_enum"`);
        await queryRunner.query(`ALTER TABLE "holidays" ADD "holiday_type" character varying(50) NOT NULL DEFAULT 'PUBLIC'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holidays" DROP COLUMN "holiday_type"`);
        await queryRunner.query(`CREATE TYPE "public"."holidays_holiday_type_enum" AS ENUM('PUBLIC', 'SPECIAL', 'ANGEL')`);
        await queryRunner.query(`ALTER TABLE "holidays" ADD "holiday_type" "public"."holidays_holiday_type_enum" NOT NULL DEFAULT 'PUBLIC'`);
    }

}
