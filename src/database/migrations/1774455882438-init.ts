import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774455882438 implements MigrationInterface {
    name = 'Init1774455882438'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "request_detail_overtime" DROP COLUMN "ot_rule_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "request_detail_overtime" ADD "ot_rule_id" integer NOT NULL`);
    }

}
