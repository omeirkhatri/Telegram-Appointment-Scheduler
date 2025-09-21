# Google Calendar Sync Setup Guide

This guide walks through the exact steps required to provision Google credentials and configure the
Best DOC Scheduler for calendar synchronisation. All steps reference current Google Cloud
documentation so you can validate the process and cross-check updates.

> **Important:** Google Maps API keys cannot be reused for Calendar sync. Maps APIs rely on API keys,
> whereas Calendar access requires OAuth 2.0 credentials. You can keep everything inside the same
> Google Cloud project, but you must create an OAuth client ID/secret dedicated to Calendar access.

---

## 1. Prepare the Google Cloud project

1. **Locate or create your Google Cloud project**
   - Console: <https://console.cloud.google.com/projectselector2/home>
   - Documentation: [Manage projects in the Google Cloud console](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
2. **Confirm billing is enabled** (required for some Google APIs)
   - Console: <https://console.cloud.google.com/billing/linkedaccount>
   - Documentation: [Enable, disable, or change billing for a project](https://cloud.google.com/billing/docs/how-to/modify-project)

> ✅ If you already use Google Maps, you can reuse the same project. Just ensure you have editor
> access to add OAuth credentials and enable additional APIs.

---

## 2. Enable the Google Calendar API

1. Navigate to the **API Library** for your project
   - Console: <https://console.cloud.google.com/apis/library>
2. Search for **"Google Calendar API"** and open the API page.
3. Click **Enable**.
   - Documentation: [Enable and disable APIs](https://cloud.google.com/apis/docs/enable-disable-apis)

> 🔐 Enabling the Calendar API does not expose any data until OAuth consent is granted by an end user
> (the staff member during connect flow).

---

## 3. Configure the OAuth consent screen

1. Open **APIs & Services → OAuth consent screen**
   - Console: <https://console.cloud.google.com/apis/credentials/consent>
2. Choose **External** user type unless your staff all belong to the same Google Workspace domain
   and you control it (then you can choose Internal).
   - Documentation: [Configuring the OAuth consent screen](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred)
3. Fill in required fields:
   - App name (e.g., `Best DOC Scheduler`)
   - User support email
   - Developer contact email(s)
4. Under **Scopes**, add `.../auth/calendar.events` (the Calendar Events scope).
   - Documentation: [Google Workspace Calendar API scopes](https://developers.google.com/calendar/api/auth)
5. Add test users (staff emails) until your app is verified or published.
6. Save and continue.

> 🧪 While the app is in testing mode, only listed test users can complete the OAuth flow.

---

## 4. Create OAuth client credentials

1. Navigate to **APIs & Services → Credentials**
   - Console: <https://console.cloud.google.com/apis/credentials>
2. Click **Create Credentials → OAuth client ID**.
3. Select **Web application** as the application type.
4. Name the client (e.g., `Best DOC Scheduler Calendar Sync`).
5. Under **Authorized redirect URIs**, add the callback URL where the app will receive tokens.
   - Example (development): `http://localhost:3000/api/google-calendar/callback`
   - Example (production): `https://your-domain.com/api/google-calendar/callback`
   - Documentation: [Create an OAuth client ID](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred)
6. Click **Create** and download the JSON. It contains:
   - `client_id`
   - `client_secret`

> 📌 Unlike API keys, OAuth client secrets should never be embedded in frontend code or checked into
> version control. Store them in server-side secret managers only.

---

## 5. Manage credentials in your infrastructure

1. **Store secrets securely**
   - Use your existing secret manager (e.g., Supabase secrets, Vercel env vars, AWS Secrets Manager).
   - Add the following variables:
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `GOOGLE_OAUTH_CLIENT_SECRET`
     - `GOOGLE_OAUTH_REDIRECT_URI`
     - `GOOGLE_OAUTH_ENCRYPTION_KEY` (random 32+ byte string for token encryption)
2. **Update local development `.env`** (do not commit!)
   - Add the same variables for running the connect flow locally.
3. **Document rotation procedure**
   - Per Google guidance: [Rotate secrets and OAuth credentials](https://cloud.google.com/iap/docs/secrets#credential-rotation)

---

## 6. Verify the OAuth flow manually

1. Start your local server and ensure the callback route is reachable.
2. Hit the initiation endpoint (e.g., `http://localhost:3000/api/google-calendar/initiate?staffId=...`).
3. Confirm the browser redirects to `accounts.google.com` showing your consent-screen details.
4. Approve access using a test Google account listed on the consent screen.
5. Ensure the callback completes, tokens are stored, and the success page renders.
   - Reference: [Using OAuth 2.0 for web server applications](https://developers.google.com/identity/protocols/oauth2/web-server)

> 🔄 If you see an `redirect_uri_mismatch` error, double-check the exact URI in both Google Cloud and
your application configuration.

---

## 7. Token encryption & storage expectations

- Tokens must be encrypted at rest before storing in Postgres.
- Use the `pgcrypto` extension with `pgp_sym_encrypt` / `pgp_sym_decrypt` or an application-level
  library.
  - Documentation: [Encrypting data with pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html)
- Ensure the encryption key is not stored in the database and is rotated periodically.
- Never log access or refresh tokens.

---

## 8. Recommended security hardening

- Restrict OAuth scopes to `https://www.googleapis.com/auth/calendar.events` only.
- Configure OAuth consent screen branding so staff recognise the app.
- Enable organization-wide 2FA/MFA where possible.
- Monitor [Google Cloud audit logs](https://cloud.google.com/logging/docs/audit) for Calendar API calls.
- Revoke credentials when staff leave the organisation.
  - Documentation: [Revoke OAuth 2.0 tokens](https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke)

---

## 9. Troubleshooting checklist

| Symptom | Likely Cause | Resolution / Reference |
| --- | --- | --- |
| `redirect_uri_mismatch` | Callback URL differs between Google console and app | Update Authorized redirect URIs ([link](https://developers.google.com/identity/protocols/oauth2/web-server#redirecting)) |
| `Error 403: access_not_configured` | Calendar API not enabled | Enable API in library ([link](https://cloud.google.com/apis/docs/enable-disable-apis)) |
| Consent screen warns “App not verified” | App in testing mode | Add tester email or complete verification ([link](https://support.google.com/cloud/answer/9110914)) |
| Token immediately expires | Clock skew or incorrect `expires_in` handling | Recompute expiry using server response ([link](https://developers.google.com/identity/protocols/oauth2/web-server#offline)) |
| `invalid_grant` during refresh | Refresh token revoked by user | Disconnect staff locally, prompt reconnection ([link](https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke)) |

---

## 10. Next steps for the codebase

1. Apply the new Supabase migration adding Google Calendar fields and encryption helpers.
2. Wire the OAuth initiation/callback routes to the new credentials.
3. Implement the Google Calendar sync service with retries, logging, and token refresh.
4. Update Telegram messaging, UI surfaces, and admin tooling to reflect connect/disconnect states.
5. Follow the testing matrix from the PRD to validate end-to-end behaviour before enabling in
   production.

For project-specific development tasks, refer to
`docs/tasks/tasks-prd-google-calendar-sync.md` alongside the PRD in `docs/prd-google-calendar-sync.md`.
