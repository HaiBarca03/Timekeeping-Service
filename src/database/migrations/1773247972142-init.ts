import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1773247972142 implements MigrationInterface {
    name = 'Init1773247972142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "shift_assignments" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "company_id" bigint NOT NULL, "employee_id" bigint NOT NULL, "store_id" bigint NOT NULL, "date" date NOT NULL, "shift_id" bigint NOT NULL, "on_time" TIMESTAMP WITH TIME ZONE NOT NULL, "off_time" TIMESTAMP WITH TIME ZONE NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_7a78d24f38deedd9fe0ea19685c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b5e8bfe8e2ca589b742dff3a0f" ON "shift_assignments" ("employee_id", "date") `);
        await queryRunner.query(`ALTER TABLE "shift_assignments" ADD CONSTRAINT "FK_5e833f28fbf459e626b71aa09d3" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shift_assignments" ADD CONSTRAINT "FK_fe59c463f888b8ee0da19404b14" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shift_assignments" DROP CONSTRAINT "FK_fe59c463f888b8ee0da19404b14"`);
        await queryRunner.query(`ALTER TABLE "shift_assignments" DROP CONSTRAINT "FK_5e833f28fbf459e626b71aa09d3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b5e8bfe8e2ca589b742dff3a0f"`);
        await queryRunner.query(`DROP TABLE "shift_assignments"`);
    }

}
