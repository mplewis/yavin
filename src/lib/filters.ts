import { FindConditions, ObjectLiteral, Not } from 'typeorm';
import { Message } from '../types';

// Copied from TypeORM source
type TypeOrmFindConditions<T> =
  | FindConditions<T>[]
  | FindConditions<T>
  | ObjectLiteral
  | string;
type MessageFindConditions = TypeOrmFindConditions<Message>;

// TODO: Serve the names of these filters to the frontend so it can auto-populate tabs
export const MESSAGE_FILTERS: { [name: string]: MessageFindConditions } = {
  clean: [{ tags: '[]' }],
  suspicious: [{ tags: Not('[]') }],
};
