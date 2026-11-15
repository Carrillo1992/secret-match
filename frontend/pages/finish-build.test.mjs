// Run with `npm run test:pages` (Node's built-in test runner).
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it } from 'node:test';

import { appConfigJson, finishBuild } from './finish-build.mjs';

describe('appConfigJson', () => {
  it('carries the API origin and the Google client id', () => {
    const json = appConfigJson({
      API_BASE_URL: 'https://api.example.test',
      GOOGLE_CLIENT_ID: 'abc.apps.googleusercontent.com',
    });

    assert.equal(
      json,
      '{\n  "apiBaseUrl": "https://api.example.test",\n  "googleClientId": "abc.apps.googleusercontent.com"\n}\n',
    );
  });

  it('leaves the Google client id empty when it is not set', () => {
    const json = appConfigJson({ API_BASE_URL: 'https://api.example.test' });

    assert.deepEqual(JSON.parse(json), {
      apiBaseUrl: 'https://api.example.test',
      googleClientId: '',
    });
  });

  it('escapes values that would break a hand-written JSON string', () => {
    const json = appConfigJson({
      API_BASE_URL: 'https://api.example.test/"quoted"\\path',
      GOOGLE_CLIENT_ID: 'line\nbreak\t"x"',
    });

    assert.match(json, /"apiBaseUrl": "https:\/\/api\.example\.test\/\\"quoted\\"\\\\path"/);
    assert.deepEqual(JSON.parse(json), {
      apiBaseUrl: 'https://api.example.test/"quoted"\\path',
      googleClientId: 'line\nbreak\t"x"',
    });
  });

  it('refuses to build without the API origin', () => {
    assert.throws(() => appConfigJson({}), /API_BASE_URL must be set/);
    assert.throws(() => appConfigJson({ API_BASE_URL: '' }), /API_BASE_URL must be set/);
  });
});

describe('finishBuild', () => {
  it('writes config.json and _headers into the output directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pages-output-'));
    try {
      finishBuild({ API_BASE_URL: 'https://api.example.test' }, pathToFileURL(`${dir}/`));

      assert.equal(
        JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')).apiBaseUrl,
        'https://api.example.test',
      );
      assert.match(
        readFileSync(join(dir, '_headers'), 'utf8'),
        /\/config\.json\n {2}! Cache-Control/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
