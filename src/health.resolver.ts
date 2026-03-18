import { Resolver, Query } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class HealthResolver {
  @Query(() => String)
  health(): string {
    return 'OK';
  }
}
