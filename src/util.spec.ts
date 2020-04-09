import { decode, headerPairsToHash } from './util';

describe('decode', () => {
  const input = 'WW91IHNwZW50IHRoZSBmaXJzdCBmaXZlIHllYXJzIHRyeWluZyB0byBnZXQgd2l0aCB0aGUgcGxhbg==';
  const output = 'You spent the first five years trying to get with the plan';
  it('decodes base64 strings as expected', () => {
    expect(decode(input)).toEqual(output);
  });
});

describe('headerPairsToHash', () => {
  it('converts a series of header pairs to a hash', () => {
    expect(headerPairsToHash([
      { name: 'full_name', value: 'Y.T.' },
      { name: 'occupation', value: 'Kourier' },
      { name: 'legal_status', value: 'Wanted' },
    ])).toEqual({
      full_name: 'Y.T.',
      occupation: 'Kourier',
      legal_status: 'Wanted',
    });
  });
});
