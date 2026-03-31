import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1774953102077 implements MigrationInterface {
    name = 'Init1774953102077'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "backdate_overrides" ADD "affected_user_ids" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "backdate_overrides" DROP COLUMN "affected_user_ids"`);
    }

}
