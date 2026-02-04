import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class RawPunchInput {
  @Field(() => String)
  company_id: string;

  @Field(() => String)
  employee_id: string;

  @Field()
  punch_time: Date;  // ISO string hoặc timestamp

  @Field()
  lark_record_id: string;

  @Field({ nullable: true })
  punch_type?: string;

  @Field({ nullable: true })
  punch_result?: string;

  @Field({ nullable: true })
  source_type?: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  @Field({ nullable: true })
  address?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  raw_payload?: any;
}