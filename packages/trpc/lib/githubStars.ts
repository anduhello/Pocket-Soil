import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";
import type {
  ParsedBookmark,
  ParsedImportFile,
} from "@karakeep/shared/import-export";

export function parseGitHubStarsUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请输入完整的 GitHub 星标页面地址。",
    });
  }
  const match = /^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/?$/.exec(
    url.pathname,
  );
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    !match ||
    url.searchParams.get("tab") !== "stars"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "仅支持 https://github.com/用户名?tab=stars 公开星标页面。",
    });
  }
  return match[1];
}

const reposSchema = z
  .array(
    z.object({
      full_name: z
        .string()
        .max(300)
        .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
      description: z.string().max(200000).nullable(),
      language: z.string().max(100).nullable(),
      topics: z.array(z.string().max(100)).max(100).optional(),
      private: z.boolean(),
    }),
  )
  .max(100);

/** Fixed official API host; public metadata only, no cookies or redirects. */
export async function readGitHubStars(
  input: string,
  fetcher: typeof fetch = fetch,
) {
  const username = parseGitHubStarsUrl(input);
  const bookmarks: ParsedBookmark[] = [];
  const seen = new Set<string>();
  const deadline = AbortSignal.timeout(45000);
  let truncated = false;
  let skipped = 0;
  for (let page = 1; page <= 5; page++) {
    const endpoint = new URL(
      `https://api.github.com/users/${username}/starred`,
    );
    endpoint.search = new URLSearchParams({
      per_page: "100",
      page: String(page),
      sort: "created",
      direction: "desc",
    }).toString();
    let repos: z.infer<typeof reposSchema>;
    try {
      const response = await fetcher(endpoint, {
        redirect: "error",
        credentials: "omit",
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Seedbed-public-stars",
        },
        signal: AbortSignal.any([deadline, AbortSignal.timeout(10000)]),
      });
      if (response.status === 403 || response.status === 429)
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "GitHub 公开接口额度暂时用完，请稍后再试。",
        });
      if (response.status === 404)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "找不到该 GitHub 用户或公开星标列表。",
        });
      if (!response.ok) throw new Error("HTTP error");
      const text = await response.text();
      if (text.length > 5 * 1024 * 1024) throw new Error("Response too large");
      repos = reposSchema.parse(JSON.parse(text));
      truncated =
        page === 5 && !!response.headers.get("link")?.includes('rel="next"');
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "GitHub 星标读取失败或超时，本次没有创建收藏。",
      });
    }
    for (const repo of repos) {
      if (repo.private || seen.has(repo.full_name.toLowerCase())) {
        skipped++;
        continue;
      }
      seen.add(repo.full_name.toLowerCase());
      const intro = [
        repo.description?.trim().slice(0, 4000),
        repo.language ? `Language: ${repo.language}` : "",
        repo.topics?.length ? `Topics: ${repo.topics.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      bookmarks.push({
        title: repo.full_name,
        content: {
          type: BookmarkTypes.LINK,
          url: `https://github.com/${repo.full_name}`,
        },
        notes: intro
          ? `GitHub 仓库简介（来源：公开星标列表）\n\n${intro}`
          : undefined,
        tags: [],
        paths: [],
      });
    }
    if (repos.length < 100) break;
  }
  return {
    title: `${username} · Stars`,
    total: bookmarks.length + skipped,
    skipped,
    truncated,
    parsed: { bookmarks, lists: [] } satisfies ParsedImportFile,
  };
}
