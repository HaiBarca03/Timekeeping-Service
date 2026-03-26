import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774510329199 implements MigrationInterface {
    name = 'Init1774510329199'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "backdate_overrides" ADD "source_id" character varying(100)`);
        await queryRunner.query(`CREATE INDEX "IDX_c5ecd73306910920ce52faef01" ON "backdate_overrides" ("source_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c5ecd73306910920ce52faef01"`);
        await queryRunner.query(`ALTER TABLE "backdate_overrides" DROP COLUMN "source_id"`);
    }

}
