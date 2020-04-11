import stemmer from 'stemmer';
import { readFile } from 'fs-extra';
import { join } from 'path';
import {
  extractWords, trimPunc, stem, stemAndCount,
} from './classify';

describe('stem', () => {
  it('calls stemmer', () => {
    const words = 'the quick brown fox jumped over the lazy dogs'.split(' ');
    words.forEach((word) => {
      expect(stem(word)).toEqual(stemmer(word));
    });
  });
});

describe('trimPunc', () => {
  it('trims punctuation from a string', () => {
    expect(trimPunc('...Quickly!!')).toEqual('Quickly');
  });
});

describe('extractWords', () => {
  it('extracts words properly', async () => {
    const text = "He'd made the classic mistake, the one he'd sworn he'd never make.";
    expect(extractWords(text)).toEqual([
      "he'd",
      'made',
      'the',
      'classic',
      'mistake',
      'the',
      'one',
      "he'd",
      'sworn',
      "he'd",
      'never',
      'make',
    ]);
  });
});

describe('stemAndCount', () => {
  it('counts instances of stemmed words', async () => {
    const text = (
      await readFile(join('fixtures', 'text', 'neuromancer.txt'))
    ).toString();
    const results = stemAndCount(text);
    const twoOrMore: { [word: string]: number } = {};
    Object.entries(results)
      .filter(([, count]) => count >= 2)
      .forEach(([word, count]) => { twoOrMore[word] = count; });
    expect(twoOrMore).toMatchInlineSnapshot(
      `
      Object {
        "a": 6,
        "and": 3,
        "case": 2,
        "damag": 2,
        "flesh": 2,
        "for": 5,
        "go": 2,
        "he": 7,
        "he'd": 6,
        "hi": 4,
        "in": 3,
        "it": 4,
        "make": 2,
        "micron": 2,
        "never": 2,
        "of": 3,
        "smile": 2,
        "still": 2,
        "sure": 2,
        "the": 11,
        "thei": 4,
        "to": 6,
        "wa": 5,
        "welcom": 2,
      }
    `,
    );
  });
});
