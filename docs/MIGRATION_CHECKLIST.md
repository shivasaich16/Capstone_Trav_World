# Replit migration checklist

- [ ] Export the complete Replit source project or connect its Git repository.
- [ ] Inspect package manifest(s), framework, build scripts, and runtime.
- [ ] Locate frontend entry point and identify HTML/CSS/JS assets.
- [ ] Locate backend entry point, API routes, and server-side business logic.
- [ ] Identify database provider, schema, migrations, and storage.
- [ ] Inventory Replit Secrets and replace with deployment environment variables.
- [ ] Copy source into this structure while preserving imports and scripts.
- [ ] Install dependencies and run locally.
- [ ] Test registration/login, search, booking, payment (if present), notifications, and admin flows.
- [ ] Configure production database, backups, HTTPS, domain, monitoring, and security.
- [ ] Deploy and run end-to-end smoke tests.
