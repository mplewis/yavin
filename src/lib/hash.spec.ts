import { sha256, sha256Native } from './hash';

describe('sha256', () => {
  it('works', () => {
    const input = 'test';
    const expected = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    expect(sha256(input)).toEqual(expected);
    expect(sha256Native(input)).toEqual(expected);
  });
});
