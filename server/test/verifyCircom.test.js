import {ok} from 'node:assert';

import {
  acceptableDiff,
} from '../verifyCircom.js';

describe('verifyCircom', () => {
  it('should support different whitespace', () => {
    ok(acceptableDiff(
    `// foo bar 2000



    test
    `,
    `// foo bar 2000

        test
    `,
    ));
  });
  it('should support different pragma versions', () => {
    ok(acceptableDiff(
    `// foo bar 2000
    pragma solidity 2.3;
    `,
    `// foo bar 2000
    pragma solidity 1.3;
    `,
    ));
  });
  it('should support different contract names', () => {
    ok(acceptableDiff(
    `// foo bar 2000
    contract Verifier1
    {
    }
    `,
    `// foo bar 2000
    contract Verifier2 {
    }
    `,
    ));
  });
  it('should support different comments', () => {
    ok(acceptableDiff(
    `// foo bar 2000
    pragma solidity 2.3;

    this is the same
    /*this is not the same
    */
    `,
    `pragma solidity 2.3;

    this is the same
    /*this can't be the same
    */
    // foo bar 2000
    `,
    ));
  });
});
