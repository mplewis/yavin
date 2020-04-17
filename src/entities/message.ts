import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export default class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('jsonb')
  data!: object;
}
