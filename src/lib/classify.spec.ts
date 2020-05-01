import stemmer from 'wink-porter2-stemmer';
import { readFile, readFileSync } from 'fs-extra';
import { join } from 'path';
// import { safeLoad } from 'js-yaml';
// import glob from 'glob';
import {
  extractWords,
  trimPunc,
  stem,
  analyzeBody,
  parseKeywordLists,
  evaluateListWords,
  evaluateListPhrases,
  evaluateList,
  // analyze,
  // tag,
  // relativeFrequency,
} from './classify';
import { StrNum } from '../types';

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

describe('analyzeBody', () => {
  it('counts instances of stemmed words', async () => {
    const text = (
      await readFile(join('fixtures', 'text', 'neuromancer.txt'))
    ).toString();
    const { body, words, wordCounts } = analyzeBody(text);
    expect(body).toEqual(text);

    const expectedWords = `
      he'd made the classic mistak the one he'd sworn he'd never make he stole from his employ he
      kept someth for himself and tri to move it through a fenc in amsterdam he still wasn't sure
      how he'd been discov not that it matter now he'd expect to die then but they onli smile of
      cours he was welcom they told him welcom to the money and he was go to need it becaus
      still smile they were go to make sure he never work again they damag his nervous system with a
      wartim russian mycotoxin strap to a bed in a memphi hotel his talent burn out micron by micron
      he hallucin for thirti hour the damag was minut subtl and utter effect for case who'd live for
      the bodiless exult of cyber space it was the fall in the bar he'd frequent as a cowboy hotshot
      the elit stanc involv a certain relax contempt for the flesh the bodi was meat case fell into
      the prison of his own flesh
    `.trim().split(/\s+/g);
    expect(words).toEqual(expectedWords);

    const twoOrMore: StrNum = {};
    Object.entries(wordCounts)
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
          "threshold": 0.1,
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
          "threshold": 0.1,
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
          "threshold": 0.1,
          "words": Array [
            "allianc",
            "agreement",
          ],
        },
      ]
    `);
  });
});

describe('with a document and keyword list', () => {
  const rawYaml = readFileSync(join('fixtures', 'keywords.yaml')).toString();
  const keywordLists = parseKeywordLists(rawYaml);
  const body = `
    Hey, did you perform that espionage I asked you about?
    The boss is asking for all the IP you stole. He wants the intellectual property badly.
    Remember, this is part of our alliance's agreement. Keep this under the table.
    Do not discuss the intellectual property (IP).
  `;
  const bodyWc = analyzeBody(body);

  describe('evaluateListWords', () => {
    it('analyzes a document for word hits', () => {
      const results: { [name: string]: number } = {};
      keywordLists.forEach((list) => { results[list.name] = evaluateListWords(bodyWc, list); });
      expect(results).toMatchInlineSnapshot(`
        Object {
          "conspiracy": 2,
          "fraud": 0,
          "theft": 3,
        }
      `);
    });
  });

  describe('evaluateListPhrases', () => {
    it('analyzes a document for phrase hits', () => {
      const results: { [name: string]: number } = {};
      keywordLists.forEach((list) => { results[list.name] = evaluateListPhrases(bodyWc, list); });
      expect(results).toMatchInlineSnapshot(`
        Object {
          "conspiracy": 1,
          "fraud": 0,
          "theft": 2,
        }
      `);
    });
  });

  describe('evaluateList', () => {
    it('analyzes a document for hits', () => {
      const results: { [name: string]: number } = {};
      keywordLists.forEach((list) => { results[list.name] = evaluateList(bodyWc, list); });
      expect(results).toMatchInlineSnapshot(`
        Object {
          "conspiracy": 3,
          "fraud": 0,
          "theft": 5,
        }
      `);
    });
  });
});

//   describe('relativeFrequency', () => {
//     it('returns the relative frequencies of hits in keyword lists', () => {
//       const result = relativeFrequency(body, keywordLists);
//       expect(result.conspiracy).toBeCloseTo(0.06);
//       expect(result.fraud).toEqual(0);
//       expect(result.theft).toBeCloseTo(0.1);
//     });
//   });

//   describe('tag', () => {
//     it('tags a document based on hit frequency', () => {
//       expect(new Set(tag(body, keywordLists, 0.05))).toEqual(
//         new Set(['theft', 'conspiracy']),
//       );
//       expect(new Set(tag(body, keywordLists, 0.1))).toEqual(new Set(['theft']));
//     });
//   });
// });

// describe('with the real keyword list and real emails', () => {
//   const rawKeywords = readFileSync(
//     join('resources', 'keywords.yaml'),
//   ).toString();
//   const keywordLists = parseKeywordLists(rawKeywords);

//   type Email = { path: string; from: string; subject: string; body: string };
//   const emailPaths: string[] = glob.sync('fixtures/emails/**/*.yaml');
//   const emails: Email[] = emailPaths.map((path) => ({
//     path,
//     ...safeLoad(readFileSync(path).toString()),
//   }));

//   it('tags emails as expected', () => {
//     type Tags = string[];
//     const allTagged: { [subject: string]: Tags } = {};
//     emails.forEach((email) => {
//       const body = `${email.subject}\n${email.body}`;
//       const tags = tag(body, keywordLists, 0.01);
//       allTagged[email.path] = tags;
//     });
//     expect(allTagged).toMatchInlineSnapshot(`
//       Object {
//         "fixtures/emails/legit/1_marketing.yaml": Array [
//           "covid19",
//         ],
//         "fixtures/emails/legit/2_password_reset.yaml": Array [],
//         "fixtures/emails/legit/3_personal.yaml": Array [
//           "sales",
//         ],
//         "fixtures/emails/legit/4_update.yaml": Array [],
//         "fixtures/emails/scam/1_419.yaml": Array [],
//         "fixtures/emails/scam/2_ebook.yaml": Array [
//           "covid19",
//           "places",
//           "scare_words",
//         ],
//         "fixtures/emails/scam/3_donation.yaml": Array [
//           "covid19",
//           "places",
//           "illness",
//         ],
//         "fixtures/emails/scam/4_sales.yaml": Array [
//           "sales",
//         ],
//       }
//     `);
//   });
// });
