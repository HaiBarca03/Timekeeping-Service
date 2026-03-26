import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774490386564 implements MigrationInterface {
    name = 'Init1774490386564'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shift_assignments" ADD "origin_id" character varying`);
        await queryRunner.query(`ALTER TABLE "shift_assignments" ADD CONSTRAINT "UQ_45a70b711b1c1652bf12e1f59e1" UNIQUE ("origin_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_45a70b711b1c1652bf12e1f59e" ON "shift_assignments" ("origin_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_45a70b711b1c1652bf12e1f59e"`);
        await queryRunner.query(`ALTER TABLE "shift_assignments" DROP CONSTRAINT "UQ_45a70b711b1c1652bf12e1f59e1"`);
        await queryRunner.query(`ALTER TABLE "shift_assignments" DROP COLUMN "origin_id"`);
    }

}
