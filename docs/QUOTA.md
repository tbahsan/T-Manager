# T-Manager — Quota Guide

> Made with ❤️ by [Tasneem Bin Ahsan (TBA)](https://github.com/tbahsan)

Default: **10,000 units/day per Google Cloud project** (resets midnight Pacific).

| Method | Cost | Where used |
|---|---|---|
| videos.list | 1 /call | dashboard |
| videos.update | 50 /video | rename + description + tags (one merged call!) |
| thumbnails.set | 50 /video | batch thumbnail |
| videos.insert | **1,600 /video** | upload queue |
| videos.delete | 50 /video | delete |
| youtubeAnalytics.reports.query | ≈1 /query | analytics (separate quota pool) |

## Use your own quota (Pro mode)
1. [console.cloud.google.com](https://console.cloud.google.com) → new project
2. Enable **YouTube Data API v3** + **YouTube Analytics API**
3. **Enable the YouTube Analytics API first** (APIs & Services → Library) —
   its scopes do NOT appear in the consent-screen picker until the API is enabled.
4. OAuth consent screen (External) → Data access → add the 5 scopes T-Manager uses
   (if any are missing from the picker, use "Manually add scopes" at the bottom):
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
   - `https://www.googleapis.com/auth/yt-analytics.readonly`
   - `https://www.googleapis.com/auth/yt-analytics-monetary.readonly` (revenue card)
5. Credentials → Create OAuth client ID → **Web application** → Authorized redirect URIs → add the exact URL shown in T-Manager → Settings → Pro mode:
   - Chrome: `https://aajgnbmobdeckkkdccphjfjlbddanhhn.chromiumapp.org/`
   - Firefox: `https://t-manager@tbahsan.dev.extensions.allizom.org/`
   (both can live in the SAME Web-application client → same client ID for both browsers)
6. Paste the client ID in T-Manager → Settings → Advanced

Need more than 10k/day? Request a quota increase in GCP Console → Quotas.
