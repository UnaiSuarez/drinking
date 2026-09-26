# Password recovery

Login links to /auth/recuperar. Supabase sends a recovery email using
resetPasswordForEmail. The PKCE callback exchanges the code at /auth/confirm
and redirects to /auth/nueva-password. The latter checks the authenticated
user and updateUser applies the password policy on the server.

Supabase Auth URL Configuration must allow these redirect URLs:

- https://drinking-gamma.vercel.app/auth/confirm?next=/auth/nueva-password
- http://localhost:3002/auth/confirm?next=/auth/nueva-password (local testing)

Keep the default recovery email ConfirmationURL, or use the SSR token-hash
template targeting /auth/confirm with type=recovery and token_hash.
The callback also supports that format and never accepts external redirects.

PKCE links should be opened in the browser that requested recovery.
Expired/invalid links lead to a new request. The email request result does
not disclose whether an account exists. Sending is rate-limited by Supabase.
Accounts without a working email require a separately verified support process.

Manual release test: request recovery for an owned test mailbox, follow its
link, reject mismatched passwords, save a new password and verify login.
Do not reset an existing user's password just to test this feature.
Email delivery and the project's redirect allowlist need verification in
Supabase; compilation alone does not verify them.
