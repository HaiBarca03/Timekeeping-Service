import { ObjectType } from '@nestjs/graphql';
import { Employee } from '../../entities/employee.entity';
import { Paginated } from 'src/utils/types/pagination';

@ObjectType()
export class EmployeePaginated extends Paginated(Employee) {}