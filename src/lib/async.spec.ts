// tslint:disable:no-expression-statement
import { asyncABC } from './async';

describe('getABC', () => {
  it('works', async () => {
    expect(await asyncABC()).toEqual(['a', 'b', 'c']);
  });
});
