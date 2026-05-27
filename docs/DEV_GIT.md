# Git workflow (avoid push rejected by bureau automation)

GitHub Actions commits to `main` daily (briefs, scans, news). If you push without pulling first, Git rejects with **fetch first**.

## One-time setup (this repo)

```bash
npm run git:hooks-install
```

That enables:

- **pre-push hook** — before `git push` to `main`, auto `git pull --rebase origin main`
- **`pull.rebase = true`** — plain `git pull` rebases instead of merge commits

Hooks are **local to this clone** (not global git config).

## Daily habits

| Do this | Instead of |
|---------|------------|
| `npm run git:push` | `git push origin main` (if hooks not installed) |
| `npm run git:sync` then `git push` | pushing blind |
| Commit before push | pushing with uncommitted tracked changes |

## If rebase conflicts

Usually in `docs/bureau/daily/latest-*.md` or `OUTREACH_QUEUE.md`:

```bash
npm run bureau:brief
git add docs/bureau/daily/latest-brief.md docs/outreach/OUTREACH_QUEUE.md
git rebase --continue
git push origin main
```

Or abort: `git rebase --abort`

## Why automation pushes to main

Bureau workflows need `contents: write` to commit daily artifacts. That’s expected. The hook keeps your work on top.

## Optional: work on a branch

For big changes, use a feature branch + PR so you merge once after CI:

```bash
git checkout -b feat/my-change
# ... commit ...
git push -u origin feat/my-change
gh pr create
```

`main` stays the deploy branch for getkinetik.app.
