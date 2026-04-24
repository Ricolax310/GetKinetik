# getkinetik.app landing page

Single-page static site. Obsidian + ruby aesthetic matching the Sovereign
Node mobile app. Zero build step, zero framework, zero dependencies.

## Files

| File          | Purpose                                                   |
| ------------- | --------------------------------------------------------- |
| `index.html`  | Entire site — HTML, CSS, and inline SVG in one file.      |
| `_headers`    | Cloudflare Pages security + cache headers.                |
| `robots.txt`  | Allow all crawlers.                                       |
| `sitemap.xml` | Single-URL sitemap for search engines.                    |

## Deploy

The site deploys to **Cloudflare Pages** at `getkinetik.app`.

### One-time setup (Cloudflare dashboard)

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages** → **Create** → **Pages** → **Direct Upload**
   (or connect to the GitHub repo if you prefer git-push-to-deploy).
3. Project name: `getkinetik`
4. Production branch: `main` (if using git integration)
5. Build output directory: `landing`
6. After the first deploy, go to **Custom domains** → **Set up a custom
   domain** → enter `getkinetik.app`. Cloudflare will auto-create the
   CNAME records because DNS is already on their nameservers.

### Subsequent deploys

**Option A — via git (recommended):** push to `main`, Cloudflare Pages
deploys automatically.

**Option B — via Wrangler:**

```bash
npm i -g wrangler
wrangler login
wrangler pages deploy landing --project-name=getkinetik
```

## Local preview

Any static file server works. Examples:

```bash
# Python 3
python -m http.server --directory landing 4173

# Node
npx --yes http-server landing -p 4173 -c-1
```

Open http://localhost:4173.

## Editing

`index.html` is intentionally one file so edits are single-diff. Palette,
typography, and claim copy are all in the top of the `<style>` block and
in the three `.claim` articles. Keep the aesthetic disciplined: obsidian
background, ruby as the only warm accent, sapphire only for secondary data
affordances.
