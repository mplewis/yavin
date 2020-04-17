import {
  Entity, PrimaryGeneratedColumn, Column, BaseEntity,
} from 'typeorm';

@Entity()
export default class Message extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  gmailId!: string;

  @Column('jsonb')
  data!: object;
}
