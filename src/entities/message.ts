import {
  Entity, PrimaryGeneratedColumn, Column, BaseEntity,
} from 'typeorm';

@Entity()
export default class Message extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'gmail_id' })
  gmailId!: string;

  @Column('jsonb')
  data!: object;
}
