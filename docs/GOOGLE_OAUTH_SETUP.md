# Google OAuth Setup for NeuroData Hub

## GCP Console Configuration

You need to add these URLs in your Google Cloud Console OAuth 2.0 Client settings.

### 1. Authorized JavaScript Origins

Add these URLs:

**For Local Development:**
```
http://localhost:3000
```

**For Production (update with your actual domain):**
```
https://your-domain.com
https://www.your-domain.com
```

**If using Vercel Preview URLs:**
```
https://*.vercel.app
```

### 2. Authorized Redirect URIs

Add these URLs:

**For Local Development:**
```
http://localhost:3000/auth/callback
```

**For Supabase Auth (REQUIRED):**
```
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

**For Production (update with your actual domain):**
```
https://your-domain.com/auth/callback
https://www.your-domain.com/auth/callback
```

## How to Find Your Supabase Project Reference

1. Go to your Supabase Dashboard
2. Select your project
3. Go to Settings → General
4. Your project reference is in the "Reference ID" field
5. Your full callback URL will be: `https://<reference-id>.supabase.co/auth/v1/callback`

## Supabase Configuration

In your Supabase Dashboard:

1. Go to Authentication → Providers
2. Enable Google provider
3. Enter your Google OAuth Client ID
4. Enter your Google OAuth Client Secret
5. Save

## Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Testing Locally

1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000/login
3. Click "Sign in with Google"
4. You should be redirected to Google, then back to `/auth/callback`, then to `/dashboard`
5. New users will see the Welcome Wizard
6. Returning users will go directly to the dashboard

## Common Issues

### "redirect_uri_mismatch" Error
- Make sure the redirect URI in GCP exactly matches what Supabase sends
- The Supabase callback URL format is: `https://<project-ref>.supabase.co/auth/v1/callback`
- Double-check for trailing slashes

### User Not Redirected After Login
- Check browser console for errors
- Verify the `/auth/callback` route is working
- Make sure cookies are enabled

### Onboarding Wizard Not Showing
- Check if `onboarding_completed` is being set correctly
- Verify the `/api/onboarding` endpoint is accessible
- Check browser console for API errors
