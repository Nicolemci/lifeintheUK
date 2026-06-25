# Life in the UK Prep

A focused web app for Life in the UK test preparation:

- timed mock tests with the real 45-minute test duration and 75% pass threshold
- practice sessions grouped by topic
- local sign-in profiles with automatic wrong-question revision lists saved in the browser
- answer explanations for revision after practice and completed mock tests

The app uses original practice questions for study support. Learners should still revise with the
latest official Life in the UK handbook and guidance before taking the real test.

Progress is saved to the browser for each local profile name. It will be restored when the same
profile signs in again on the same device/browser. Syncing across devices would require adding a
backend account service.

## Getting started

```bash
npm install
npm run dev
```

## Checks

```bash
npm run test
npm run build
```
