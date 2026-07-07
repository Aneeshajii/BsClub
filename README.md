# BsClub

## Local development

1. Copy `.env.example` to `.env`
2. Fill in `DATABASE_URL` and `ADMIN_PASSWORD`
3. Run:

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

## Deploy on Vercel

1. Push this repository to GitHub
2. Import it in Vercel
3. Add these environment variables:
   - `DATABASE_URL`
   - `ADMIN_PASSWORD`
4. In Vercel, set the build command to `npm run vercel-build`
5. Deploy

> This project uses PostgreSQL for production hosting. For local development, use a local PostgreSQL instance or a hosted provider like Neon or Supabase.
