import stemmer from 'wink-porter2-stemmer';
import yaml from 'js-yaml';
import { StrNum } from '../types';

type List = { name: string; threshold: number; words: string[]; phrases: string[] }
type BodyWithWordCounts = {
  body: string;
  words: string[];
  wordCounts: { [word: string]: number };
}

/**
 * The values for each key in the keywords file.
 */
type KeywordDetails = { threshold: number; description: string; keywords: string[] }

/**
 * Count instances of unique strings.
 *
 * https://stackoverflow.com/a/15052738/254187
 */
function countUniqueStrings(arr: string[]): StrNum {
  const counts: StrNum = {};
  for (let i = 0; i < arr.length; i += 1) {
    counts[arr[i]] = 1 + (counts[arr[i]] || 0);
  }
  delete counts[''];
  return counts;
}

/**
 * Stem a word. Used as a simple shim to provide clean imports for other source files that
 * need to stem words.
 * @param word The word to be stemmed
 */
export function stem(word: string): string {
  return stemmer(word);
}

/**
 * Trim punctuation from the start and end of a string.
 *
 * https://stackoverflow.com/a/4328722/254187
 *
 * @param s The string to be trimmed
 */
export function trimPunc(s: string): string {
  return s
    .replace(/^[.,/#!$%^&*;:{}=\-_`~()]+/, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]+$/, '');
}

/**
 * Given input text, extract lowercase words, trimming all whitespace.
 * @param text The text from which to extract words
 */
export function extractWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((s) => s.toLowerCase())
    .map((s) => trimPunc(s));
}

/**
 * Given input text, extract all the words, stem each one, and count instances of each stem.
 * @param body The text to analyze
 */
export function analyzeBody(body: string): BodyWithWordCounts {
  const unstemmed = extractWords(body);
  const words = unstemmed.map((w) => stem(w)).filter((w) => w.length > 0);
  const wordCounts = countUniqueStrings(words);
  return { body, words, wordCounts };
}

/**
 * Classify an item as a word or a phrase.
 * @param item The item to classify
 */
function wordOrPhrase(item: string): 'word' | 'phrase' {
  return item.match(/\s/) ? 'phrase' : 'word';
}

/**
 * Parse the keywords YAML into Lists.
 * @param rawYaml The raw YAML from a keywords file
 */
export function parseKeywordLists(rawYaml: string): List[] {
  const rawObj: { [name: string]: KeywordDetails } = yaml.safeLoad(rawYaml);
  const lists: List[] = [];
  Object.entries(rawObj).forEach(([name, details]) => {
    const { threshold } = details;
    const words: string[] = [];
    const phrases: string[] = [];
    details.keywords.forEach((rawItem) => {
      const lowered = rawItem.toLowerCase();
      if (wordOrPhrase(lowered) === 'phrase') {
        phrases.push(lowered);
        return;
      }
      words.push(stem(lowered));
    });
    lists.push({
      name, threshold, words, phrases,
    });
  });
  return lists;
}

/**
 * Analyze the words in a document and return the number of hits for a given list.
 * Keywords occurring multiple times are counted multiple times.
 * @param bodyWords The body of the document to be analyzed
 * @param list The list to search for matching keywords
 */
export function evaluateListWords(bodyWc: BodyWithWordCounts, list: List): number {
  const { wordCounts } = bodyWc;
  const { words } = list;
  return words.reduce((total, word) => total + (wordCounts[word] || 0), 0);
}

/**
 * Analyze the phrases in a document and return the number of hits for a given list.
 * Phrases occurring multiple times are counted multiple times.
 * @param bodyWords The body of the document to be analyzed
 * @param list The list to search for matching keywords
 */
export function evaluateListPhrases(bodyWc: BodyWithWordCounts, list: List): number {
  const { body } = bodyWc;
  const { phrases } = list;
  return phrases.reduce((total, phrase) => {
    const matcher = new RegExp(phrase, 'gi');
    const hits = (body.match(matcher) || []).length;
    return total + hits;
  }, 0);
}

// /**
//  * Analyze the phrases in a document and return the number of hits in each list.
//  * Phrases occurring multiple times are counted multiple times.
//  * @param body The body of the document to be analyzed
//  * @param lists The lists to search for matching keywords
//  */
// export function analyzePhrases(body: string, lists: List[]): Hits {
//   const hits: StrNum = {};
//   lists.forEach(({ name, phrases }) => {
//     phrases.forEach((phrase) => {
//       const matcher = new RegExp(phrase, 'gi');
//       hits[name] = (body.match(matcher) || []).length;
//     });
//   });
//   return { hits };
// }

// /**
//  * Sum the counts from two or more Hits results and convert to (hit count) / (body word count)
//  * percentage.
//  * @param objects The string-number hashes to combine
//  */
// function combineCounts(...allHits: Hits[]): StrNum {
//   const results: StrNum = {};
//   allHits.forEach(({ hits }) => {
//     Object.entries(hits).forEach(([name, count]) => {
//       results[name] = (results[name] || 0) + count;
//     });
//   });
//   return results;
// }

// /**
//  * Analyze a document and return the (hit count) / (body word count) percentage
//  * for each keyword list.
//  * @param body The body of the document to be analyzed
//  * @param lists The lists to search for matching keywords
//  */
// export function analyze(body: string, lists: List[]): HitPercentages {
//   const wordHits = analyzeWords(body, lists);
//   const phraseHits = analyzePhrases(body, lists);
//   const combinedCounts = combineCounts(wordHits, phraseHits);
//   const totalWordsInBody = extractWords(body).length;
//   const hitPercentages: StrNum = {};
//   Object.entries(combinedCounts).forEach(([listName, count]) => {
//     hitPercentages[listName] = count / totalWordsInBody;
//   });
//   return { hitPercentages };
// }

// /**
//    * Tag a document based on the relative frequency of occurring words from keyword lists.
//    * @param body The text to analyze
//    * @param lists The lists to search for matching keywords
//    * @param threshold A fractional percentage (`0 < n < 1`).
//    *                  If `category_hits / word_count >= threshold`, the tag is applied.
//    */
// export function tag(body: string, lists: List[]): Tags {
//   const { hitPercentages } = analyze(body, lists);
//   const wordCount = extractWords(body).length;
//   return Object.entries(hitPercentages)
//     .filter(([name, hitsCount]) => {
//       if (!hitsCount) return false;
//       return (hitsCount / wordCount) >= threshold;
//     })
//     .map(([name]) => name);
// }
