import stemmer from 'wink-porter2-stemmer';
import { readFile } from 'fs-extra';
import { join } from 'path';
import {
  extractWords,
  trimPunc,
  stem,
  stemAndCount,
  parseKeywordLists,
  analyzeWords,
} from './classify';
import { StrNum } from './types';

describe('stem', () => {
  it('calls the stemmer', () => {
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
    const twoOrMore: StrNum = {};
    Object.entries(results)
      .filter(([, count]) => count >= 2)
      .forEach(([word, count]) => {
        twoOrMore[word] = count;
      });
    expect(twoOrMore).toMatchInlineSnapshot(`
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
        "his": 4,
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
        "they": 4,
        "to": 6,
        "was": 5,
        "welcom": 2,
      }
    `);
  });
});

describe('parseKeywordLists', () => {
  it('parses words and phrases from keyword lists, lowercases all, and stems words', async () => {
    const rawYaml = (
      await readFile(join('fixtures', 'keywords.yaml'))
    ).toString();
    expect(parseKeywordLists(rawYaml)).toMatchInlineSnapshot(`
      Array [
        Object {
          "name": "theft",
          "phrases": Array [
            "intellectual property",
          ],
          "words": Array [
            "ip",
            "espionag",
          ],
        },
        Object {
          "name": "fraud",
          "phrases": Array [
            "contract law",
          ],
          "words": Array [
            "pyramid",
            "ponzi",
            "loophol",
          ],
        },
        Object {
          "name": "conspiracy",
          "phrases": Array [
            "under the table",
          ],
          "words": Array [
            "allianc",
            "agreement",
          ],
        },
      ]
    `);
  });
});

describe('analyzeWords', () => {
  it('analyzes a document for keyword list hits', async () => {
    const rawYaml = (
      await readFile(join('fixtures', 'keywords.yaml'))
    ).toString();
    const keywordLists = parseKeywordLists(rawYaml);
    const body = `
      Hey, did you perform that espionage I asked you about?
      The boss is asking for all the IP you stole.
      Remember, this is part of our alliance's agreement.
    `;
    expect(analyzeWords(body, keywordLists)).toMatchInlineSnapshot(`
      Object {
        "conspiracy": 2,
        "fraud": 0,
        "theft": 2,
      }
    `);
  });
});
