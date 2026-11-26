# Deployment design

Host the static React bundle on Vercel, the Docker Node API on Render, PostgreSQL on Supabase and identity in Firebase. Redis backs shared rate counters. Provider keys, Firebase Admin credentials, database and Redis URLs belong in backend secret storage. Firebase browser configuration is public configuration.

The browser calls Firebase for identity and Express for application data. Production network traffic uses HTTPS or verified TLS. The API alone connects to PostgreSQL and the AI provider. Application and migration database privileges should be separated.
