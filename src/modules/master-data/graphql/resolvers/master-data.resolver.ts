import { Resolver, Query, Args, ID, Int } from '@nestjs/graphql';
import { Employee } from '../../entities/employee.entity';
import { MasterDataService } from '../../master-data.service';
import { EmployeePaginated } from '../types/employee-paginated.type';

@Resolver(() => Employee)
export class MasterDataResolver {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Query(() => EmployeePaginated, { name: 'employees' })
  async getEmployees(
    @Args('companyId', { type: () => ID }) companyId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ) {
    return this.masterDataService.findAllEmployees(companyId, page, limit);
  }

  @Query(() => Employee, { name: 'employee', nullable: true })
  async getEmployee(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.masterDataService.findOneEmployee(id);
  }
}