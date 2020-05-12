# yavin

Scan your email for treachery

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

# Stretch Goals

- [ ] Serve compiled frontend from backend
- [ ] Classification: Bad SPF
- [ ] Classification: Bad DKIM
- [ ] Classification: Domain reputation?
- [ ] Classification: Has attachments
- [ ] Classification: Links to Drive/Dropbox
- [ ] Classification: Includes extraneous email addresses
