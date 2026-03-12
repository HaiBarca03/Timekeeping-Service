import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities/base.entity';
import { Company } from './company.entity';
import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
@Entity('work_locations')
@Index(['companyId', 'locationName'], { unique: true })
export class WorkLocation extends BaseEntity {
  @Field(() => ID)
  @Column({ name: 'company_id', type: 'bigint' })
  companyId: string;

  @Field()
  @Column({ name: 'location_name', type: 'varchar' })
  locationName: string;

  @Field({ nullable: true })
  @Column({ name: 'address', type: 'text', nullable: true })
  address: string;

  @Field(() => Float, { nullable: true })
  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number; 

  @Field(() => Float, { nullable: true })
  @Column({ name: 'longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Field(() => Float, { nullable: true, defaultValue: 200 })
  @Column({ name: 'radius_meters', type: 'int', default: 200 })
  radiusMeters: number;

  @Field(() => Company)
  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;
}