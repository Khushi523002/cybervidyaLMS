# Cyber Vidya Backend

Node.js + Express API for the LMS frontend, backed by MongoDB.

## Setup

```bash
cd Backend
copy .env.example .env
npm install
npm run dev
```

Default API URL: `http://127.0.0.1:8000`

Default MongoDB URL: `mongodb://127.0.0.1:27017/cyber_vidya_lms`

## Default Accounts

The API does not create users on startup. Create the default accounts manually when needed:

```bash
npm run create-default-accounts
```

Or, if you want to run the management file directly with nodemon:

```bash
nodemon management/createDefaultAccounts.js
```

This creates any missing accounts from:

- `admin@cybervidya.com`
- `manager@cybervidya.com`
- `intern@cybervidya.com`

Password for all created accounts defaults to `password123`. Override it with `DEFAULT_ACCOUNT_PASSWORD`.

## Structure

- `src/config` - environment and MongoDB connection
- `src/models` - Mongoose schemas
- `src/controllers` - request handlers
- `src/routes` - API route wiring
- `src/middlewares` - auth, errors, 404 handling
- `src/utils` - auth tokens, password hashing, Excel parsing, serializers
- `src/services` - reusable domain services
- `management` - command-style scripts such as default account creation
