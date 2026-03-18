import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType() 
export class BatchPunchResult {
  @Field(() => Int)
  savedCount: number;

  @Field(() => [String], { nullable: true })
  savedIds?: string[];         

  @Field(() => Int, { nullable: true })
  queuedCalculations?: number; 

  @Field({ nullable: true })
  message?: string;           
}