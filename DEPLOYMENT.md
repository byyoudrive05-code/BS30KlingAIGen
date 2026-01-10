# Netlify Deployment Guide

This guide will help you deploy your Kling AI Video Generator to Netlify.

## Quick Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

## Step-by-Step Deployment

### 1. Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Connect to Netlify

1. Go to [Netlify](https://app.netlify.com/)
2. Click **"Add new site"** > **"Import an existing project"**
3. Choose your Git provider and authorize Netlify
4. Select your repository

### 3. Configure Build Settings

Netlify should automatically detect the settings from `netlify.toml`, but verify:

- **Base directory:** (leave empty)
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18

### 4. Set Environment Variables

In Netlify dashboard, go to:
**Site settings** > **Environment variables** > **Add a variable**

Add the following variables:

| Key | Value | Where to find |
|-----|-------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Supabase Dashboard > Settings > API |

### 5. Deploy

Click **"Deploy site"** and wait for the build to complete.

## Post-Deployment Checklist

### 1. Verify Supabase Configuration

Ensure your Supabase project has:

- ✅ All database migrations applied
- ✅ Storage bucket created (`images`)
- ✅ Edge functions deployed:
  - `generate-video`
  - `check-video-status`
  - `poll-video-status`
  - `auth-login`
- ✅ Authentication enabled
- ✅ RLS policies configured

### 2. Configure CORS (if needed)

If you encounter CORS issues, add your Netlify domain to Supabase:

1. Go to Supabase Dashboard > **Authentication** > **URL Configuration**
2. Add your Netlify URL to **Site URL** and **Redirect URLs**

Example: `https://your-app-name.netlify.app`

### 3. Test Your Deployment

1. Visit your Netlify URL
2. Try to log in or create an account
3. Test video generation
4. Check the browser console for any errors

## Continuous Deployment

Netlify automatically redeploys your site when you push to your connected Git branch.

### Custom Domain

To add a custom domain:

1. Go to **Site settings** > **Domain management**
2. Click **"Add custom domain"**
3. Follow the instructions to configure DNS

## Troubleshooting

### Build Fails

**Error:** `Command failed with exit code 1`

**Solution:**
- Check that all dependencies are in `package.json`
- Ensure Node version compatibility (use Node 18)
- Review build logs for specific errors

### Environment Variables Not Working

**Error:** `undefined` values for environment variables

**Solution:**
- Ensure variable names start with `VITE_`
- Redeploy after adding environment variables
- Clear build cache: **Site settings** > **Build & deploy** > **Clear cache and retry deploy**

### Supabase Edge Functions Not Working

**Error:** `Failed to fetch` or CORS errors

**Solution:**
- Edge functions run on Supabase, not Netlify
- Verify edge functions are deployed in Supabase
- Check Supabase function logs
- Ensure CORS headers are correctly configured in edge functions

### Video Upload Fails

**Error:** Storage errors

**Solution:**
- Verify storage bucket exists in Supabase
- Check storage policies are configured
- Ensure bucket is named `images`

### Page Not Found (404) on Refresh

**Error:** 404 when refreshing the page

**Solution:**
- The `netlify.toml` file should handle this with redirects
- If issue persists, verify `netlify.toml` is in the root directory

## Performance Optimization

### Enable Build Plugins

Consider adding these Netlify plugins:

1. **Lighthouse CI** - Performance monitoring
2. **Next Image Plugin** - Image optimization
3. **Subfont** - Font optimization

### Caching

The default caching is configured in `netlify.toml`. You can customize it:

```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## Monitoring

### Analytics

Enable Netlify Analytics:
1. Go to **Site settings** > **Analytics**
2. Enable analytics

### Function Logs

Monitor Supabase Edge Functions:
1. Go to Supabase Dashboard
2. Click **Edge Functions**
3. View logs for each function

## Need Help?

- [Netlify Documentation](https://docs.netlify.com/)
- [Supabase Documentation](https://supabase.com/docs)
- Check the main README.md for project-specific information
