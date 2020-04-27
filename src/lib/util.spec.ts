import {
  encode, decode, headerPairsToHash, keepTruthy,
} from './util';

describe('encode', () => {
  const input = 'You spent the first five years trying to get with the plan';
  const output = 'WW91IHNwZW50IHRoZSBmaXJzdCBmaXZlIHllYXJzIHRyeWluZyB0byBnZXQgd2l0aCB0aGUgcGxhbg==';
  it('encodes base64 strings as expected', () => {
    expect(encode(input)).toEqual(output);
  });
});

describe('decode', () => {
  const input = 'QW5kIHRoZSBuZXh0IGZpdmUgeWVhcnMgdHJ5aW5nIHRvIGJlIHdpdGggeW91ciBmcmllbmRzIGFnYWlu';
  const output = 'And the next five years trying to be with your friends again';
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

describe('keepTruthy', () => {
  it('only keeps truthy items', () => {
    const input: (string | null | undefined)[] = ['a', null, 'b', undefined, 'c'];
    const result: string[] = keepTruthy(input);
    expect(result).toEqual(['a', 'b', 'c']);
  });
});
