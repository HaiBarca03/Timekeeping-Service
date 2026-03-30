import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774841482267 implements MigrationInterface {
    name = 'Init1774841482267'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_496072134ffffe2a4bcc6fb1d9"`);
        await queryRunner.query(`ALTER TABLE "attendance_groups" DROP COLUMN "group_type_code"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e61dd1fab443e84f7576c7f2fa" ON "attendance_groups" ("company_id", "code") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e61dd1fab443e84f7576c7f2fa"`);
        await queryRunner.query(`ALTER TABLE "attendance_groups" ADD "group_type_code" character varying(50)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_496072134ffffe2a4bcc6fb1d9" ON "attendance_groups" ("company_id") `);
    }

}
