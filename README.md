# Desh 71 — bilingual news portal

Static HTML/CSS/JavaScript news portal backed by Supabase JS v2. Compatible with GitHub Pages; no build step is required.

## Configure Supabase

1. Create a Supabase project and open SQL Editor.
2. Run [`supabase/schema.sql`](supabase/schema.sql). This is the repository's documented baseline schema: `articles`, `categories`, and `profiles`, with bilingual fields and row-level security.
3. Edit `config/supabase.js`: set `url` to the project URL and `anonKey` to the project's **publishable key** (legacy anon/public key is also supported). These are public browser credentials; never use `service_role`, secret, or other privileged keys in this repository.
4. Add an administrator through Supabase Authentication (do not enable public signups for this admin panel), then grant the role from the trusted SQL Editor using the example at the bottom of `supabase/schema.sql`. Authorization checks and all write policies independently verify `profiles.role` through the database `is_admin()` function; a client-side role value is never trusted.
5. Create categories in `/admin/categories.html`, then create and publish bilingual stories from `/admin/editor.html`.

The schema is a starter contract because no database schema was present in the repository when this integration was added. If an existing project uses different column/table names, migrate it to this contract or adapt the Supabase queries and policies together. Do not weaken RLS to make the browser work.

## Pages

- `index.html`: latest published stories and lead story.
- `category.html?slug=national`: published stories for a category slug.
- `search.html?q=term`: bilingual search across published article text.
- `article.html?id=<uuid>`: published article detail.
- `admin/login.html`, `admin/dashboard.html`, `admin/articles.html`, `admin/editor.html`, `admin/categories.html`: Supabase Auth-protected administration.

Routes and assets are relative, so the site works both at a domain root and under a GitHub Pages project path. Supabase JS v2 loads from esm.sh; visitors need access to that CDN and the Supabase project. Search filters the published records fetched from Supabase in the browser.

## Security notes

RLS is enabled for every table. Anonymous visitors can read categories and published articles only. Authenticated editors without the `admin` profile role have no content write access. Never expose a service key or manually grant roles from the browser. Review SQL changes before applying them to a production project.

## Verification

The repository has no package manifest, test runner, configured Supabase project, or credentials. Static checks can verify file paths and JavaScript syntax, but live data/auth/RLS and browser behavior require a configured Supabase project and were not testable from this repository alone.
