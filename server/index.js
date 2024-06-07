import pg from 'pg';
import {isAddress} from 'viem';

import {verifyCircom} from './verifyCircom.js';
import {findChain} from './chains.js';
import {TABLE_PKG_ASSOC} from './constants.js';

const pool = new pg.Pool({
  connectionString: process.env.PG_CONNECTION,
});

export async function handler(event) {
  if('body' in event) {
    // Running on AWS
    event = JSON.parse(event.body);
  }
  try {
    switch(event.payload.action) {
      // TODO move newest and pkg-assoc to blob s3
      case 'newest':
        return await getNewest(event);
      case 'pkg-assoc':
        return await getPkgAssoc(event);
      case 'verifyCircom':
        return await verifyCircom(event);
      default:
        throw new Error('invalid_command');
    }
  } catch(error) {
    console.error(error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        errorType: 'error',
        errorMessage: error.message
      }),
    };
  }
}

async function getNewest(event) {
  if(isNaN(event.payload.offset) || event.payload.offset < 0)
    throw new Error('invalid_offset');
  if(isNaN(event.payload.limit)
      || event.payload.limit < 0
      || event.payload.limit > 1000)
    throw new Error('invalid_limit');

  const query = await pool.query(`
    SELECT
      *
    FROM ${TABLE_PKG_ASSOC}
    ORDER BY id DESC
    LIMIT ${Math.floor(event.payload.limit)}
    OFFSET ${Math.floor(event.payload.offset)}
  `);

  return query.rows.map(row => {
    row.address = '0x' + row.address.toString('hex');
    return row;
  });
}

async function getPkgAssoc(event) {
  if(!event.payload)
    throw new Error('missing_payload');
  if(!isAddress(event.payload.address))
    throw new Error('invalid_address');

  const query = await pool.query(`
    SELECT * FROM ${TABLE_PKG_ASSOC} WHERE address = $1
  `,
  [
    Buffer.from(event.payload.address.slice(2), 'hex'),
  ]);

  return {
    statusCode: 200,
    body: query.rows,
  };
}
