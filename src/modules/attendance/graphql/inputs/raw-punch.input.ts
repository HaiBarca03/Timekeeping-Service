import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@InputType()
export class RawPunchInput {
  @Field(() => String)
  company_id: string;

  @Field(() => String)
  external_user_id: string;

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

  @Field({ nullable: true })
  device_id?: string;

  @Field({ nullable: true })
  ssid?: string;

  @Field({ nullable: true })
  photo_url?: string;

  @Field({ nullable: true })
  shift_time_target?: Date;

  @Field(() => GraphQLJSON, { nullable: true })
  raw_payload?: any;
}