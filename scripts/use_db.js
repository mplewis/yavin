#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

const { writeFileSync } = require('fs-extra');
const { Client } = require('pg');

const ORMCONFIG_TARGET_PATH = 'ormconfig.json';
const VALID_ENVS = ['dev', 'test', 'prod', 'docker'];
const VALID_ENVS_MSG = `Valid envs: ${VALID_ENVS.join(', ')}`;

const ORMCONFIG_TEMPLATE = {
  type: 'postgres',
  // host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '',
  // database: 'yavin_somesuffix',

  synchronize: true,
  logging: false,

  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscribers/**/*.ts'],
  cli: {
    entitiesDir: 'src/entities',
    migrationsDir: 'src/migrations',
    subscribersDir: 'src/subscribers',
  },
};

function quit(msg) {
  console.error(msg);
  process.exit(1);
}

function selectHost(env) {
  if (env === 'docker') return 'postgres';
  return 'localhost';
}

function selectDatabase(env) {
  return `yavin_${env}`;
}

function buildOrmconfig(env) {
  const host = selectHost(env);
  const database = selectDatabase(env);
  const ormconfig = { ...ORMCONFIG_TEMPLATE, host, database };
  return JSON.stringify(ormconfig, null, 2);
}

function wipeTestDatabase(env) {
  const database = selectDatabase(env);
  if (!['yavin_test', 'yavin_docker'].includes(database)) {
    console.log(`Refusing to wipe database ${database}`);
    return Promise.resolve();
  }

  const client = new Client({
    host: selectHost(env),
    port: 5432,
    user: 'postgres',
    password: '',
    statement_timeout: 5000,
    query_timeout: 5000,
  });

  client.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  return new Promise((resolve, reject) => {
    console.log(`Connecting to ${database}`);
    client.connect().then(() => {
      console.log(`Dropping ${database}`);
      client.query(`DROP DATABASE ${database}`, (err) => {
        if (err) console.log(err.message);
        console.log(`Creating ${database}`);
        client.query(`CREATE DATABASE ${database}`, (err2) => {
          client.end();
          if (err2) return reject(err2);
          console.log(`Database ${database} (re)created and made pristine`);
          return resolve();
        });
      });
    });
  });
}

function main() {
  const [, , env] = process.argv;
  if (!env) quit(`Usage: scripts/use_db.js <ENV>\n${VALID_ENVS_MSG}`);
  if (!VALID_ENVS.includes(env)) quit(`Invalid env: ${env}\n${VALID_ENVS_MSG}`);

  const ormconfig = buildOrmconfig(env);
  writeFileSync(ORMCONFIG_TARGET_PATH, ormconfig);
  console.log(`ORM config written to ${ORMCONFIG_TARGET_PATH}`);
  wipeTestDatabase(env).catch((err) => {
    if (err) quit(err.message);
  });
}

main();
