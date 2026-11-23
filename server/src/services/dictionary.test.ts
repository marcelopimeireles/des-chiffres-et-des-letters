import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  buildLexicon, findBestWords, getLexicon, lookupDictionaryWord
} from './dictionary';

test('offline dictionaries load for every selectable language', () => {
  for (const lang of ['en', 'pt', 'fr'] as const) {
    assert.ok(getLexicon(lang).words.length > 1000);
  }
  assert.equal(lookupDictionaryWord('en', 'water'), 'water');
  assert.equal(lookupDictionaryWord('pt', 'casa'), 'casa');
  assert.equal(lookupDictionaryWord('fr', 'bonjour'), 'bonjour');
});

test('accent folding recognizes Portuguese and French spellings', () => {
  assert.equal(lookupDictionaryWord('pt', 'café'), 'café');
  assert.equal(lookupDictionaryWord('pt', 'cafe'), 'café');
  assert.equal(lookupDictionaryWord('fr', 'être'), 'être');
});

test('unlisted and malformed words are rejected without network access', () => {
  assert.equal(lookupDictionaryWord('en', 'zzzunlikelyword'), null);
  assert.equal(lookupDictionaryWord('pt', 'casa!'), null);
});

test('solver finds longest known words, and respects repeated letters', () => {
  const dict = buildLexicon(['cat', 'car', 'cart', 'carton', 'carts', 'tart', 'tartar']);
  const result = findBestWords(dict, ['C', 'A', 'R', 'T', 'S', 'O', 'N'], 'en');
  assert.equal(result.bestLength, 6);
  assert.deepEqual(result.bestWords, ['carton']);
  const result2 = findBestWords(dict, ['C', 'A', 'R', 'T', 'S'], 'en');
  assert.equal(result2.bestLength, 5);
  assert.deepEqual(result2.bestWords, ['carts']);
});

test('solver counts accents as unaccented tiles', () => {
  const dict = buildLexicon(['café', 'casa', 'ação']);
  const result = findBestWords(dict, ['C', 'A', 'F', 'E', 'S'], 'pt');
  assert.equal(result.bestLength, 4);
  assert.deepEqual(result.bestWords, ['café']);
});
