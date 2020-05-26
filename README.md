# Yavin

Scan your email for treachery.

- Search for occurrences of specific keywords and phrases
- Review suspicious emails in the Yavin interface to understand possible scams
- Tag emails in your Gmail inbox so you can review anything suspicious without leaving Gmail

# Usage

## Quick Start

In a terminal in this project's directory, start the app using Docker Compose:

```
git clone https://github.com/mplewis/yavin
cd yavin
docker-compose up
```

**Or,:** do it by hand with a Postgres server running locally on port 5432, allowing all connections for user `postgres` with no password:

```
# Make sure your Postgres server is started!
sudo service postgresql start
# Clone this project
git clone https://github.com/mplewis/yavin
cd yavin
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

All commands should be prefixed with `yarn`.

- `start`: Start the frontend (with hot reload) and backend servers.
- `start:watch`: Same as `start` but restarts the backend server on code changes.
- `test`: Run all tests (`test:jest`, `test:lint`, `test:frontend`).
- `test:watch`: Run backend tests with a watcher.
- `todo`: List all bits of the codebase marked with `TODO`, `FIXME`, or `HACK`.
- `fix`: Runs Prettier then eslint-autofix to standardize code and fix any cosmetic issues.

# Development

## Keywords

The Keywords are what defines if an email is suspicious or not. Keywords are defined in `resources/keywords.yaml`. For example:

```yaml
places:
  threshold: 0.005
  description: >
    These words are associated with places commonly discussed in conjunction with COVID-19.
    The sender may be trying to legitimize their message by linking it to recent news you've read
    about these places.
  keywords:
    - Japan
    - Wuhan
    - China
    - Italy
    - South Korea
```

This defines a keyword called `places` with the following:

- `threshold`: The threshold above which the email is marked as suspicious. In this case, if the occurrences percentage exceeds 0.5%, the email will be marked as suspicious with the `places` keyword.
- `description`: Displayed to the user when they view an email marked with `places`.
- `keywords`: The words and phrases that define this keyword. The Classify worker searches for occurrences of these.

"Occurrence percentage" is defined by the following algorithms:

**Separate words and phrases**

- For each keyword:
- If it has a space in it, add it to the set of suspicious phrases
- Otherwise, it's a word; _stem it_ and add it to the set of suspicious words

**Calculate word suspicion**

- Take the plain English text content of the email
- Total = count of all words in email
- Stem all words in it
- Suspicious = count of all words that also appear in the set of suspicious words (multiple occurrences count multiple times)
- Word occurrence = suspicious / total

**Calculate phrase suspicion**

- Take the plain English text content of the email
- Total = count of all words in email
- Suspicious = count of all occurrences of all suspicious phrases in the content (multiple occurrences count multiple times)
- Phrase occurrence = suspicious / total

**Calculate occurrence percentage**

- Occurrence percentage = phrase suspicion + word suspicion (this can exceed 100%)

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

### `src/workers/persist.ts`

The Persist worker pages through the inbox and saves any new messages to the database.

### `src/workers/classify.ts`

The Classify worker runs after each Persist run. It analyzes the text content of any messages that have not yet been tagged, then it applies tags and labels them in Gmail.

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

See also the entire list of code TODOs by running `yarn todo`.

- No authentication
- No multi-user support
- Emails are stored in plaintext at rest
- No easy way to re-tag previously-tagged emails when tagging rules change
- No tuning has been done on tagging thresholds
- `<style>` tags are stripped, but the CSS content remains in email bodies
- Not yet able to get content out of a body attachment
- Router is unused, but should be used to hold the view state (which page and email are you looking at?) so that refreshing the page doesn't lose your spot
- No awareness of API rate limits
- No debug levels; debug messages spam the console
- No way to reclassify messages after they've been initially classified
- Reclassifying a message does not reset existing Yavin labels
- Fetch window builtin is hacked into the frontend, and types aren't yet validating
- CSS and links remain in the email text body, leading to false negatives
- No support for token refresh, invalidating token on scopes change
- Wasteful API calls:
  - Classify worker checks label existence on every batch
  - Classify worker applies labels to individual emails rather than batching
  - Persist worker does not stop paging once it sees an email that is in the DB
- Frontend build is totally untested
- Frontend only runs via dev server, for now
- Frontend is not served from backend
- Janky types symlink hack is janky, and frontend/backend projects should be in Yarn workspaces
- Keywords list has super-aggressive thresholds that have NOT been tuned with a proper training set

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
- [x] Finish README
- [ ] Server REST spec
- [ ] Use `internalDate` for parsing received-at date
- [x] Tune params for keyword tagging

# Stretch Goals

- [x] Serve compiled frontend from backend WONTDO
- [ ] Classification: Bad SPF
- [ ] Classification: Bad DKIM
- [ ] Classification: Domain reputation?
- [ ] Classification: Has attachments
- [ ] Classification: Links to Drive/Dropbox
- [ ] Classification: Includes extraneous email addresses
