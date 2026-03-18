import { Field, ObjectType, Int, InterfaceType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';

@ObjectType()
export class PaginationInfo {
  @Field(() => Int)
  totalItems: number;

  @Field(() => Int)
  itemCount: number;

  @Field(() => Int)
  itemsPerPage: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Int)
  currentPage: number;
}

export function Paginated<T>(classRef: Type<T>) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [classRef], { nullable: 'itemsAndList' })
    items: T[];

    @Field(() => PaginationInfo)
    meta: PaginationInfo;
  }
  return PaginatedType as any;
}

@ObjectType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 1 })
  page: number;

  @Field(() => Int, { defaultValue: 10 })
  limit: number;
}