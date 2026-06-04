// Substack publisher — draft creation only (never auto-publish).

export interface PublishResult {
  ok: boolean;
  channel: "substack";
  message: string;
  draftId?: string | number;
  draftUrl?: string;
}

export interface SubstackDraftOptions {
  dryRun?: boolean;
  title?: string;
  subtitle?: string;
}

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function publicationHost(): string | null {
  const blogId = process.env.SUBSTACK_BLOG_ID?.trim();
  if (!blogId) return null;
  if (blogId.includes(".")) return blogId.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${blogId}.substack.com`;
}

/** Create a draft via Substack internal API (session key = SUBSTACK_API_KEY). */
export async function publishSubstackDraft(
  markdown: string,
  opts: SubstackDraftOptions = {},
): Promise<PublishResult> {
  const apiKey = process.env.SUBSTACK_API_KEY?.trim();
  const host = publicationHost();

  if (!apiKey || !host) {
    return {
      ok: false,
      channel: "substack",
      message:
        "SUBSTACK_API_KEY or SUBSTACK_BLOG_ID not set — draft saved to landing/public/drip/substack.md",
    };
  }

  const dryRun = opts.dryRun ?? process.env.DRIP_DRY_RUN === "true";
  const title = opts.title || extractTitle(markdown, "DePIN Signal Report");
  const subtitle = opts.subtitle || "Cross-network observational index";

  if (dryRun) {
    return {
      ok: true,
      channel: "substack",
      message: `DRY_RUN: would create draft "${title}" on ${host}`,
    };
  }

  const url = `https://${host}/api/v1/drafts`;
  const body = {
    draft_title: title,
    draft_subtitle: subtitle,
    draft_body: markdown,
    type: "newsletter",
    audience: "everyone",
    is_published: false,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: `connect.sid=${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      channel: "substack",
      message: `Substack API ${res.status}: ${raw.slice(0, 400)}`,
    };
  }

  let data: { id?: number | string; draft_id?: number | string; slug?: string };
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, channel: "substack", message: "Substack API: invalid JSON response" };
  }

  const draftId = data.id ?? data.draft_id;
  const draftUrl = draftId ? `https://${host}/publish/post/${draftId}` : `https://${host}/publish`;

  return {
    ok: true,
    channel: "substack",
    message: `Draft created (not published): ${title}`,
    draftId,
    draftUrl,
  };
}
