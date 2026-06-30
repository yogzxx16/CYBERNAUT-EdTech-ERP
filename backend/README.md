# Cybernaut Minutos ERP — Backend

Production-ready Node.js + Express + TypeScript + MongoDB foundation.
**No business modules yet** — only authentication.

## Quick start

```bash
cd backend
cp .env.example .env          # then fill in JWT secrets + MongoDB URI
npm install
npm run dev                   # → http://localhost:4000/api/v1
```

## Endpoints (v1)

| Method | Path                            | Auth | Purpose                |
| ------ | ------------------------------- | ---- | ---------------------- |
| POST   | `/api/v1/auth/register`         | —    | Create account         |
| POST   | `/api/v1/auth/login`            | —    | Sign in                |
| POST   | `/api/v1/auth/refresh`          | RT   | Rotate access token    |
| POST   | `/api/v1/auth/logout`           | RT   | Revoke refresh token   |
| POST   | `/api/v1/auth/forgot-password`  | —    | Issue reset token      |
| POST   | `/api/v1/auth/reset-password`   | —    | Consume reset token    |
| POST   | `/api/v1/auth/change-password`  | JWT  | Change current password|
| GET    | `/api/v1/auth/me`               | JWT  | Current user           |

`RT` = refresh token (cookie `rt` or body), `JWT` = `Authorization: Bearer <access>`.

## Architecture

```
src/
  config/          env, db, central config, constants
  middlewares/     auth, rbac, error, asyncHandler, request logger, validate
  modules/
    auth/
      controllers/ HTTP layer (thin)
      services/    Business logic
      repositories/Mongoose data access (User, Token)
      validators/  Zod schemas
      routes/      Express router
      dto/         Outbound shapes
  routes/          v1 router (mounts modules)
  types/           Express request augmentation
  utils/           jwt, password, apiResponse, apiError, pagination, token, logger
```

## Security

- JWT access tokens (short-lived) + opaque-hashed refresh tokens (rotated on use, revocable)
- bcrypt password hashing (configurable rounds)
- helmet, CORS allow-list, cookie-parser with signing secret
- Global + per-route rate limiters
- All inputs validated with Zod before reaching services
- Refresh tokens stored as SHA-256 hashes with a TTL index for auto-purge
- Forgot-password never leaks account existence; reset tokens are single-use
- Password change revokes all active refresh tokens
