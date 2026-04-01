import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1775033380325 implements MigrationInterface {
    name = 'Init1775033380325'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_b1507ca50d9d279f752ceffc1c7"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "job_level_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "job_level_id" bigint`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_b1507ca50d9d279f752ceffc1c7" FOREIGN KEY ("job_level_id") REFERENCES "job_levels"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
