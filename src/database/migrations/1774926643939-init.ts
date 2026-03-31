import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774926643939 implements MigrationInterface {
    name = 'Init1774926643939'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shift_assignments" DROP COLUMN "store_id"`);
        await queryRunner.query(`ALTER TABLE "shift_assignments" ADD "store_id" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shift_assignments" DROP COLUMN "store_id"`);
        await queryRunner.query(`ALTER TABLE "shift_assignments" ADD "store_id" bigint NOT NULL`);
    }

}
