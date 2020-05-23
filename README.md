# yavin

Scan your email for treachery

# Usage

## Quick Start

### Start Postgres

You'll need to configure a local instance of Postgres that accepts all connections from localhost without a password.

### Start the app

In a terminal in this project's directory:

```
# Clone this project
git clone https://github.com/mplewis/yavin
# Install all dependencies, including dev dependencies
yarn install
# Start the frontend and backend servers
yarn start
# If you want the backend server to restart on code changes, use watch mode
yarn start:watch
```

Now you'll have a frontend and backend server running. Go to [localhost:9999](http://localhost:9999) to authorize the app with Google and your Gmail account.

Once the app has the credentials it needs, it will start fetching your messages and send you to your inbox.

## Commands

TODO

# Development

TODO

## Overview

TODO

## Keywords

TODO

## Models

This application uses only one model: `message`. Each row represents one [Gmail message](https://developers.google.com/gmail/api/v1/reference/users/messages):

| name       | type        | nullable? | description                                                                                                                    |
| ---------- | ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| id         | number      |           | Primary key. Automatically assigned and incremented.                                                                           |
| gmailId    | string      |           | The id of the message assigned by Gmail                                                                                        |
| data       | jsonb       |           | The entire JSON body of the `Users.messages.get` response for a single message. Messages are retrieved in `format: full` mode. |
| receivedAt | timestamptz |           | The date the email arrived at Gmail servers, parsed from headers                                                               |
| taggedAt   | timestamptz | nullable  | The date the email was classified with tags                                                                                    |
| tags       | jsonb       | nullable  | A JSON array of the tags applied to this email                                                                                 |

## Workers

TODO

## Project Layout

### Frontend

The frontend is a Vue project created with [Vue CLI](https://cli.vuejs.org/). It is a standalone project that lives entirely within `frontend`, with a couple of exceptions:

- Linting rules cascade from the parent `.eslintrc`
- `frontend/types.ts` is symlinked to `src/types.ts`. This is a hack to share backend types (e.g. arrays of email content responses) with the frontend.

This is not the ideal project layout, and if I were to bring this to production readiness, I would use something like [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) to packageize the frontend and backend alongside one another.

The frontend project itself is pretty sparse:

- `frontend/src/main.ts`: The entry point for the app. When bundling for production, start here. You can add global Vue plugins (e.g. BootstrapVue) in this file with `Vue#use`.
- `frontend/src/router/index.ts`: The router configuration. Unused right now.
- `frontend/src/store/index.ts`: The VueX store configuration. Unused right now.
- `frontend/src/views/App.vue`: The main view for the app. This embeds the router and is where global styles live. If this project were to progress, this would probably host the navbar.
- `frontend/src/views/Inbox.vue`: The Inbox view. This is where the user spends all their time. Allows the user to page through emails and view their content. This component is responsible for fetching email data from the server and handling pagination.
- `frontend/src/components/Summary.vue`: The left-side list of emails. This displays the sender, subject, and tags for an email.
- `frontend/src/components/Details.vue`: The right-side view of an email's content. This lets the user read emails and find out why Yavin tagged them.

### Backend

All backend source files are under the project Typescript root of `src/`.

#### `src/entities`

Yavin uses [TypeORM](https://github.com/typeorm/typeorm), an ORM for TypeScript that supports migrations and multiple different access patterns. Each entity (sometimes known as a model) gets its own file in this directory.

#### `src/lib`

This is where the core logic of the app is defined.

- `index.ts`: The core Express server logic of the app. Also includes logic to manage backend workers that run in the same process as the server.
- `types.ts`: Shared types. This is symlinked (huge hack) into `frontend/src/types` to share types between frontend and backend.
- `auth`: Allows the backend to complete the two parts of the auth flow: 1. installing Google App secure credentials, 2. signing into Gmail as the user with their permission.
- `classify`: Classifies email body text and tags an email according to lists of keywords.
- `content`: Extracts text body content from emails. Produces the core input for classification.
- `gmail`: TypeScript wrapper for the less-ergonomic Gmail APIs.
- `storage`: Stores onboarding secure credentials in the filesystem rather than the database. This is not production-ready.
- `util`: Utility functions used by other bits of the codebase. For example, wrappers for base64 en/decoding.

#### `src/scripts`

Scripts intended for direct use by developers. Run them with `yarn ts-node scripts/my_script.ts`.

#### `src/types`

Type wrappers for libraries without typing. I don't quite know how to use this properly.

#### `src/workers`

Bits of functionality intended to be used periodically as background workers.

#### `fixtures/`

Static file test fixtures, e.g. text body corpus for specs, keywords files.

#### `resources/keywords.yaml`

The tags and keywords to be used to classify emails.

#### `scripts/`

Scripts intended for direct use by developers. Run them directly from the shell.

`scripts/use_db.js` is used to set the current database to dev, test, or prod.

#### `secrets/`

This is used by the `storage` library to persist critical credentials onto the disk outside of the database. If this app is ever moved to cloud deployment, you will need to refactor storage/secrets into some kind of vault service.

# Known Issues

This app is **not** production-ready and should never be deployed to a public system. It is not secure, does not store data securely, and will expose all of your indexed email to anyone who finds it. **Do not deploy this app.**

- No authentication
- No multi-user support
- Emails are stored in plaintext at rest
- No easy way to re-tag previously-tagged emails when tagging rules change
- No tuning has been done on tagging thresholds
- `<style>` tags are stripped, but the CSS content remains in email bodies
- Not yet able to get content out of a body attachment
- Router is unused, but should be used to hold the view state (which page and email are you looking at?) so that refreshing the page doesn't lose your spot

# TODO

- [x] Set up a database
- [x] Ingest emails into the DB idempotently
- [x] Get tests working in CI with DB
- [x] OAuth with Express server backend
- [x] Create Vue frontend
- [x] Pass data props to Vue components
- [x] Use live data in Vue frontend
- [x] Classify emails in DB
- [x] Criteria for converting tags to suspicion WONTDO
- [x] Move emails from inbox to Yavin suspicious tag
- [x] Tell user why emails are marked suspicious
- [x] Start both frontend and backend with `yarn start`
- [x] Make categories on top work
- [x] Write user guide in README
- [x] Send user daily summary email WONTDO
- [x] Don't re-tag emails with a tagged date
- [x] Fix build
- [x] Make `yarn test` run frontend tests and linting too
- [x] List TODOs command
- [x] Implement pagination in fetch emails
- [x] Fix files with pre-commit hook
- [ ] Server REST spec
- [ ] Use `internalDate` for parsing received-at date

# Stretch Goals

- [x] Serve compiled frontend from backend WONTDO
- [ ] Classification: Bad SPF
- [ ] Classification: Bad DKIM
- [ ] Classification: Domain reputation?
- [ ] Classification: Has attachments
- [ ] Classification: Links to Drive/Dropbox
- [ ] Classification: Includes extraneous email addresses
