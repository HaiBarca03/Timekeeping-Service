import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774491789071 implements MigrationInterface {
    name = 'Init1774491789071'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_15f20cce35abe382898defa4a7"`);
        await queryRunner.query(`ALTER TABLE "backdate_overrides" DROP COLUMN "entity_id"`);
        await queryRunner.query(`ALTER TABLE "backdate_overrides" ADD "entity_id" character varying(100) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_15f20cce35abe382898defa4a7" ON "backdate_overrides" ("entity_type", "entity_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_15f20cce35abe382898defa4a7"`);
        await queryRunner.query(`ALTER TABLE "backdate_overrides" DROP COLUMN "entity_id"`);
        await queryRunner.query(`ALTER TABLE "backdate_overrides" ADD "entity_id" bigint NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_15f20cce35abe382898defa4a7" ON "backdate_overrides" ("entity_type", "entity_id") `);
    }

}
