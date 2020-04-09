import { decode } from './util';

describe('decode', () => {
  const input = 'WW91IHNwZW50IHRoZSBmaXJzdCBmaXZlIHllYXJzIHRyeWluZyB0byBnZXQgd2l0aCB0aGUgcGxhbg==';
  const output = 'You spent the first five years trying to get with the plan';
  it('decodes base64 strings as expected', () => {
    expect(decode(input)).toEqual(output);
  });
});
