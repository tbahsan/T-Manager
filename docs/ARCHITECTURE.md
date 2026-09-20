# T-Manager — Architecture

> Made with ❤️ by [Tasneem Bin Ahsan (TBA)](https://github.com/tbahsan) · plan ref: §৩

```
POPUP (thin UI — no API calls)  ⇄  runtime messages  ⇄  BACKGROUND (logic)
oauth · youtube · batch-runner · upload · analytics · quota · history
                                   ⇅ fetch (Bearer token)
                        YouTube Data API v3 + YouTube Analytics API
```

Rules:
1. **All API calls live in the background** — the popup is a thin client.
2. **Every job checkpoints to storage** — MV3 service workers die anytime; work resumes (plan §১৪).
3. **Undo snapshots before every write** — taken from cache, 0 quota units.
