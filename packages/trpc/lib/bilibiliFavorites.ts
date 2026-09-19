import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";
import type {
  ParsedBookmark,
  ParsedImportFile,
} from "@karakeep/shared/import-export";

const MAX_PAGES = 25;
const pageSchema = z.object({
  code: z.number(),
  data: z
    .object({
      info: z.object({
        title: z.string().max(1024),
        media_count: z.number().int().nonnegative(),
      }),
      has_more: z.boolean(),
      medias: z
        .array(
          z.object({
            type: z.number(),
            title: z.string().max(4096),
            bvid: z.string().nullish(),
            intro: z.string().max(20000).nullish(),
          }),
        )
        .max(20)
        .nullable(),
    })
    .nullish(),
});

export function parseBilibiliFavoriteUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "请输入完整的 B 站公开收藏夹地址。",
    });
  }
  const fid = url.searchParams.get("fid");
  if (
    url.protocol !== "https:" ||
    url.hostname !== "space.bilibili.com" ||
    url.port ||
    url.username ||
    url.password ||
    !/^\/\d{1,20}\/favlist\/?$/.test(url.pathname) ||
    !fid ||
    !/^\d{1,20}$/.test(fid)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "仅支持 space.bilibili.com 上带 fid 的 HTTPS 收藏夹地址。",
    });
  }
  return fid;
}

/** Public metadata only. Fixed API host, no cookies, no redirects, bounded requests. */
export async function readBilibiliFavorites(
  input: string,
  fetcher: typeof fetch = fetch,
) {
  const fid = parseBilibiliFavoriteUrl(input);
  const bookmarks: ParsedBookmark[] = [];
  let title = "";
  let total = 0;
  let skipped = 0;
  let hasMore = false;
  const deadline = AbortSignal.timeout(45000);
  for (let page = 1; page <= MAX_PAGES; page++) {
    const endpoint = new URL("https://api.bilibili.com/x/v3/fav/resource/list");
    endpoint.search = new URLSearchParams({
      media_id: fid,
      pn: String(page),
      ps: "20",
      platform: "web",
    }).toString();
    let payload: z.infer<typeof pageSchema>;
    try {
      const response = await fetcher(endpoint, {
        redirect: "error",
        credentials: "omit",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.bilibili.com",
        },
        signal: AbortSignal.any([deadline, AbortSignal.timeout(10000)]),
      });
      if (!response.ok) throw new Error("HTTP error");
      const text = await response.text();
      if (text.length > 1024 * 1024) throw new Error("Response too large");
      payload = pageSchema.parse(JSON.parse(text));
    } catch {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "B 站读取失败或超时，请稍后重试；本次没有创建收藏。",
      });
    }
    if (payload.code !== 0 || !payload.data) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "收藏夹不可公开读取、已失效或平台限制访问。不会自动获取登录凭证。",
      });
    }
    const data = payload.data;
    if (page === 1) {
      title = data.info.title;
      total = data.info.media_count;
    }
    for (const media of data.medias ?? []) {
      if (
        media.type !== 2 ||
        !media.bvid ||
        !/^BV[A-Za-z0-9]{10}$/.test(media.bvid)
      ) {
        skipped++;
        continue;
      }
      const intro = media.intro?.trim();
      bookmarks.push({
        title: media.title.trim(),
        content: {
          type: BookmarkTypes.LINK,
          url: `https://www.bilibili.com/video/${media.bvid}`,
        },
        notes: intro
          ? `B站视频简介（来源：公开收藏夹，非视频内容总结）\n\n${intro}`
          : undefined,
        tags: [],
        paths: [],
      });
    }
    hasMore = data.has_more;
    if (!hasMore) break;
    if (!data.medias?.length) {
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "收藏夹分页不完整，请稍后重试；本次没有创建收藏。",
      });
    }
  }
  return {
    title,
    total,
    skipped,
    truncated: hasMore,
    parsed: { bookmarks, lists: [] } satisfies ParsedImportFile,
  };
}
