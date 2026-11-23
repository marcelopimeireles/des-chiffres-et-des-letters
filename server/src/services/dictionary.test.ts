import { strict as assert } from 'node:assert';
import test from 'node:test';
import { DictionaryUnavailableError, lookupDictionaryWord } from './dictionary';

function fakeResponse(status: number, payload: unknown = []) {
  return (async (url: string | URL | Request) => {
    return { status, ok: status >= 200 && status < 300, json: async () => payload };
  }) as typeof fetch;
}

test('language code controls dictionary locale (en, fr, pt-BR)', async () => {
  for (const [lang, locale] of [['en','en'],['fr','fr'],['pt','pt-BR']] as const) {
    let requested = '';
    const request = (async (url: string | URL | Request) => {
      requested = String(url);
      return { status: 200, ok: true, json: async () => [{ word: 'teste' }] };
    }) as typeof fetch;
    assert.equal(await lookupDictionaryWord(lang, 'teste', request), true);
    assert.ok(requested.includes(`/entries/${locale}/teste`));
  }
});

test('dictionary 404 returns not found; 503 is unavailable, never invalid', async () => {
  assert.equal(await lookupDictionaryWord('fr', 'absent', fakeResponse(404)), false);
  await assert.rejects(
    () => lookupDictionaryWord('fr', 'mot', fakeResponse(503)),
    DictionaryUnavailableError
  );
});

test('dictionary payload requires matching headword', async () => {
  assert.equal(await lookupDictionaryWord('en', 'cat', fakeResponse(200, [{ word: 'dog' }])), false);
  assert.equal(await lookupDictionaryWord('en', 'cat', fakeResponse(200, [{ word: 'cat' }])), true);
});
