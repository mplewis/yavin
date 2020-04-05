import { double, power } from './number';

describe('double', () => {
  it('doubles', () => {
    expect(double(2)).toEqual(4);
  });
});

describe('power', () => {
  it('works', () => {
    expect(power(2, 4)).toEqual(16);
  });
});
