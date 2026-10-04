# Shared site content setup

GitHub Pages only serves static files. This site stores project records and branding in Supabase so admin edits are shared across browsers, and uses Supabase Realtime to update pages that are already open.

## 1. Create the Supabase database

1. Create a Supabase project.
2. In its SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. In **Authentication → Users**, create the admin user with an email and password.
4. Keep public sign-ups disabled. Only users explicitly added to `site_admins` can change site content.
5. In the SQL Editor, find the new account's UUID:

   ```sql
   select id, email from auth.users;
   ```

6. Grant it admin access, replacing the UUID:

   ```sql
   insert into public.site_admins (user_id)
   values ('YOUR-ADMIN-USER-UUID');
   ```

## 2. Configure the site

Copy `.env.example` to `.env` for local development. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the project's URL and **publishable** key from the Supabase project's API settings. The publishable key is intended to be included in browser code; never use a Supabase secret or service-role key here.

For GitHub Pages, add those same values as repository **Actions variables** named `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **Settings → Secrets and variables → Actions → Variables**. The deploy workflow passes them to the Vite build.

In **Settings → Pages**, set the build and deployment source to **GitHub Actions**. Push the changes to `main`; the workflow will compile the TypeScript app and deploy the built `dist/` site.

## 3. Move existing browser-only content

After deploying and configuring Supabase, sign in at `/admin.html` using the Supabase admin account. If this browser has old local-only projects or branding, the Overview page offers **Import browser content**. Importing replaces the current shared projects and branding with the values from that browser. Other browsers' local storage cannot be accessed or recovered by the site.

## Security notes

- The public site can read the content, but database row-level security allows updates only for accounts listed in `site_admins`.
- Keep Supabase public sign-ups disabled and do not put a secret/service-role key in a `VITE_` variable, source file, or GitHub Actions variable.
- Existing `localStorage` admin credentials are no longer used. Create and manage the admin account in Supabase Authentication.
