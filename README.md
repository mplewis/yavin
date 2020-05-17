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

# Development

## Project Layout

### Frontend

The frontend is a Vue project created with [Vue CLI](https://cli.vuejs.org/). It is a standalone project that lives entirely within `frontend`, with a couple of exceptions:

- Linting rules cascade from the parent `.eslintrc`
- `frontend/types.ts` is symlinked to `src/types.ts`. This is a hack to share backend types (e.g. arrays of email content responses) with the frontend.

This is not the ideal project layout, and if I were to bring this to production readiness, I would use something like [Yarn Workspaces](https://classic.yarnpkg.com/en/docs/workspaces/) to packageize the frontend and backend alongside one another.

The frontend project itself is pretty sparse:

- `src/main.ts`: The entry point for the app. When bundling for production, start here. You can add global Vue plugins (e.g. BootstrapVue) in this file with `Vue#use`.
- `src/router/index.ts`: The router configuration. Unused right now.
- `src/store/index.ts`: The VueX store configuration. Unused right now.
- `src/views/App.vue`: The main view for the app. This embeds the router and is where global styles live. If this project were to progress, this would probably host the navbar.
- `src/views/Inbox.vue`: The Inbox view. This is where the user spends all their time. Allows the user to page through emails and view their content. This component is responsible for fetching email data from the server and handling pagination.
- `src/components/Summary.vue`: The left-side list of emails. This displays the sender, subject, and tags for an email.
- `src/components/Details.vue`: The right-side view of an email's content. This lets the user read emails and find out why Yavin tagged them.

### Backend

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
- [ ] OAuth with Express server backend
- [x] Create Vue frontend
- [x] Pass data props to Vue components
- [x] Use live data in Vue frontend
- [x] Classify emails in DB
- [ ] Criteria for converting tags to suspicion
- [ ] Move emails from inbox to Yavin suspicious tag
- [ ] Tell user why emails are marked suspicious
- [x] Start both frontend and backend with `yarn start`
- [ ] Make categories on top work
- [ ] Write user guide in README
- [ ] Send user daily summary email
- [x] Don't re-tag emails with a tagged date
- [x] Fix build
- [x] Make `yarn test` run frontend tests and linting too
- [x] List TODOs command
- [x] Implement pagination in fetch emails
- [x] Fix files with pre-commit hook
- [ ] Server REST spec

# Stretch Goals

- [ ] Serve compiled frontend from backend
- [ ] Classification: Bad SPF
- [ ] Classification: Bad DKIM
- [ ] Classification: Domain reputation?
- [ ] Classification: Has attachments
- [ ] Classification: Links to Drive/Dropbox
- [ ] Classification: Includes extraneous email addresses
