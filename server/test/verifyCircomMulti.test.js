import {ok} from 'node:assert';
import { readFileSync } from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

import { verifyCircomMulti } from '../verifyCircomMulti.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('verifyCircomMulti', function () {
  this.timeout(2 * 60 * 1000); // 2 minutes
  it('should verify semaphore v4', async () => {
    const input = JSON.parse(readFileSync(join(__dirname, 'semaphorev4.json'), 'utf8'));
    const output = await verifyCircomMulti({ payload: input }, { skipSave: true });
    ok(output.statusCode === 200);
  });
});
