import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1773716130744 implements MigrationInterface {
    name = 'Init1773716130744'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" ADD "is_maternity_shift" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "is_maternity_shift"`);
    }

}
