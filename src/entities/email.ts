import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export default class Email {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('jsonb')
  data!: object;
}
