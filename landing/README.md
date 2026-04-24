# getkinetik.app landing page

Single-page static site. Obsidian + ruby aesthetic matching the Sovereign
Node mobile app. Zero framework, zero build step.

## Files

| File                              | Purpose                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| `landing/index.html`              | Landing page — HTML, CSS, and inline SVG in one file.      |
| `landing/app.js`                  | Platform detection, CTA handler, waitlist modal.           |
| `landing/_headers`                | Cloudflare Pages security + cache headers.                 |
| `landing/robots.txt`              | Allow all crawlers.                                        |
| `landing/sitemap.xml`             | Single-URL sitemap.                                        |
| `functions/api/waitlist.js`       | Cloudflare Pages Function: `POST /api/waitlist`. **Lives at the repo root**, not inside `landing/`, per Cloudflare Pages convention. |

## MINT YOUR NODE — how the CTA behaves

The primary CTA checks the visitor's platform and responds accordingly:

- **Android with a live APK URL** → direct APK download.
- **Every other visitor** → opens the waitlist modal. Email is submitted
  to `POST /api/waitlist` and stored in a Cloudflare KV namespace.

The APK URL lives in one place — the top of `app.js`:

```js
var ANDROID_APK_URL = null; // set to 'https://.../getkinetik.apk' when ready
```

Set that constant to the public download URL once the APK is hosted, then
redeploy. Until then, every visitor sees the waitlist.

## Deploy

The site deploys to **Cloudflare Pages** at `getkinetik.app`.

### One-time Pages setup

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create** → **Pages** → connect GitHub repo `Ricolax310/GetKinetik`.
2. Project name: `getkinetik`
3. Production branch: `main`
4. Build command: *(none)*
5. Build output directory: `landing`
6. After first deploy → **Custom domains** → add `getkinetik.app`.

### One-time KV setup (required for the waitlist)

The waitlist function writes to a KV namespace. You create it once and
bind it to the Pages project:

1. **Workers & Pages** → **KV** → **Create a namespace** → name:
   `GETKINETIK_WAITLIST`.
2. Open the `getkinetik` Pages project → **Settings** → **Functions** →
   **KV namespace bindings** → **Add binding**:
   - Variable name: `WAITLIST`
   - KV namespace: `GETKINETIK_WAITLIST`
3. Save. The next deploy picks up the binding automatically.

You can view submitted emails in **Workers & Pages** → **KV** →
`GETKINETIK_WAITLIST` → each key is `waitlist:<email>` with the JSON
entry as its value.

### Subsequent deploys

Push to `main`. Cloudflare Pages rebuilds and deploys automatically.

## Local preview

The landing page itself works from any static file server, but the
`/api/waitlist` function only runs on Cloudflare. To preview the full
stack locally use Wrangler:

```bash
npm i -g wrangler
wrangler pages dev landing --kv WAITLIST
```

This serves `landing/` on http://localhost:8788 with an in-memory KV
namespace standing in for the production binding.

For static-only preview (no waitlist):

```bash
# Python
python -m http.server --directory landing 4173

# Node
npx --yes http-server landing -p 4173 -c-1
```

## Editing

Palette, typography, and copy all live at the top of the `<style>` block
in `index.html`. Keep the aesthetic disciplined: obsidian background,
ruby as the only warm accent, sapphire only for secondary data
affordances.
