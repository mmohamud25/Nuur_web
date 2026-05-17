# Nuur Web

Standalone web version of the Nuur newtab experience by Kulan Group Ltd.

**Live:** https://nuur.kulaninstitute.org

## Deployment

Push to GitHub Pages:
```
git init
git add .
git commit -m "Nuur Web v1"
git remote add origin https://github.com/mmohamud25/nuur-web.git
git push -u origin main
```

Then in repo Settings → Pages → Source: main branch / root.
Add CNAME record in DNS: `nuur.kulaninstitute.org → mmohamud25.github.io`

## Features
- Full chat with Claude (Sonnet 4.5)
- Dashboard with career tracker
- Academics tab (courses, flashcards, research, writing)
- Settings with Literary theme by default
- All data synced to Supabase

## Extension-only features (not available on web)
- Agent mode (requires browser tab access)
- Screen capture
- Selection popup
- Focus reader injection
