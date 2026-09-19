import { describe, expect, it, vi } from "vitest";
import {
  parseBilibiliFavoriteUrl,
  readBilibiliFavorites,
} from "./bilibiliFavorites";

const folder =
  "https://space.bilibili.com/3546917912971351/favlist?fid=3593427651&ftype=create";
const page = (more: boolean, medias: unknown[]) =>
  new Response(
    JSON.stringify({
      code: 0,
      data: {
        info: { title: "默认收藏夹", media_count: 33 },
        has_more: more,
        medias,
      },
    }),
  );
const video = {
  type: 2,
  title: "设计参考",
  bvid: "BV1u2Ke6hEZk",
  intro: "视频的公开简介",
};

describe("public Bilibili favourites connector", () => {
  it("accepts only the supported HTTPS folder URL", () => {
    expect(parseBilibiliFavoriteUrl(folder)).toBe("3593427651");
    for (const url of [
      "http://space.bilibili.com/1/favlist?fid=2",
      "https://localhost/1/favlist?fid=2",
      "https://space.bilibili.com.evil.test/1/favlist?fid=2",
      "https://u:p@space.bilibili.com/1/favlist?fid=2",
      "https://space.bilibili.com:444/1/favlist?fid=2",
      "https://space.bilibili.com/1/favlist",
      "https://space.bilibili.com/1/favlist?fid=oops",
      "https://space.bilibili.com/1/",
    ]) {
      expect(() => parseBilibiliFavoriteUrl(url)).toThrow();
    }
  });
  it("reads all pages, preserving titles and descriptions without generating tags", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page(true, [video]))
      .mockResolvedValueOnce(
        page(false, [
          { ...video, bvid: "BV1qQc4zxEsi", intro: "" },
          { type: 21, title: "非视频" },
        ]),
      );
    const result = await readBilibiliFavorites(folder, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1][0])).toContain("pn=2");
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: "omit",
      redirect: "error",
    });
    expect(result).toMatchObject({ total: 33, skipped: 1, truncated: false });
    expect(result.parsed.bookmarks[0]).toMatchObject({
      title: "设计参考",
      content: { url: "https://www.bilibili.com/video/BV1u2Ke6hEZk" },
      tags: [],
    });
    expect(result.parsed.bookmarks[0].notes).toContain("视频的公开简介");
    expect(result.parsed.bookmarks[1].notes).toBeUndefined();
  });
  it("does not return partial data when a later page fails", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page(true, [video]))
      .mockRejectedValueOnce(new Error("timeout"));
    await expect(readBilibiliFavorites(folder, fetcher)).rejects.toThrow(
      "本次没有创建收藏",
    );
  });
  it("reports inaccessible folders and malformed responses", async () => {
    for (const response of [
      new Response('{"code":-403}'),
      new Response("not json"),
      new Response("", { status: 403 }),
    ]) {
      await expect(
        readBilibiliFavorites(
          folder,
          vi.fn<typeof fetch>().mockResolvedValue(response),
        ),
      ).rejects.toThrow();
    }
  });
  it("bounds pagination and explicitly flags incomplete imports", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => page(true, [video]));
    const result = await readBilibiliFavorites(folder, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(25);
    expect(result.truncated).toBe(true);
  });
  it("does not follow malformed video IDs or empty unfinished pages", async () => {
    const invalid = await readBilibiliFavorites(
      folder,
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          page(false, [{ ...video, bvid: "https://localhost" }]),
        ),
    );
    expect(invalid.skipped).toBe(1);
    expect(invalid.parsed.bookmarks).toHaveLength(0);
    await expect(
      readBilibiliFavorites(
        folder,
        vi.fn<typeof fetch>().mockResolvedValue(page(true, [])),
      ),
    ).rejects.toThrow("分页不完整");
  });
  it.skipIf(process.env.RUN_BILIBILI_LIVE !== "1")(
    "reads the supplied public folder without writing bookmarks",
    async () => {
      const result = await readBilibiliFavorites(folder);
      expect(result.truncated).toBe(false);
      expect(result.parsed.bookmarks.length).toBeGreaterThan(0);
      console.log(
        JSON.stringify({
          title: result.title,
          total: result.total,
          videos: result.parsed.bookmarks.length,
          skipped: result.skipped,
          descriptions: result.parsed.bookmarks.filter((b) => b.notes).length,
        }),
      );
    },
    50000,
  );
});
