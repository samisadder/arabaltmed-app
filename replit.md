# CyberSource REST Client (Node.js SDK)

## Overview
This is the official Node.js SDK for the CyberSource REST API (npm package `cybersource-rest-client`). It is a **library**, not a runnable web application — it has no frontend and no backend server. Applications import it to call CyberSource payment APIs.

- **Language/Runtime:** Node.js 20
- **Package manager:** npm
- **Entry point:** `src/index.js` (the `main` field in `package.json`)
- **Test runner:** Mocha (`npm test`)

## Project Layout
- `src/` — SDK source: `api/` (API clients), `model/` (request/response models), `authentication/` (auth core), `utilities/`, `ApiClient.js`, `index.js`
- `test/` — Mocha specs mirroring `src/api` and `src/model`
- `generator/` — Swagger/OpenAPI code generation tooling and spec (`cybersource-rest-spec.json`)
- `docs/` — generated API documentation

## Setup Notes (Replit)
- Dependencies installed via `npm install`.
- The `test` script in `package.json` was corrected from `./node_modules/mocha/bin/mocha` (nonexistent path) to `mocha`, which resolves through the local `.bin`.
- The SDK loads and exports its API correctly (`require('./src/index')`).

## Running Tests
```
npm test
```
Note: The bundled tests instantiate API clients that require a configured CyberSource **MerchantConfig** (merchant credentials). Without real credentials, the test harness fails in its `beforeEach` hook with `Cannot read properties of undefined (reading 'authenticationType')`. This is expected and not a setup defect — supply a valid merchant configuration to run the tests against the CyberSource sandbox/production.

## User Preferences
(none recorded yet)
