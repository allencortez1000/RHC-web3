# Render deployment

Deploy `apps/api` using `infrastructure/docker/Dockerfile.api` or a Node service running:

```bash
npm install
npm run db:generate
npm run build -w @rhc/api
npm run start -w @rhc/api
```

Required variables are documented in `.env.example`.
