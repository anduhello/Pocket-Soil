import { describe, expect, it, vi } from "vitest";
import { parseGitHubStarsUrl, readGitHubStars } from "./githubStars";

const url = "https://github.com/anduhello?tab=stars";
const repo = {
  full_name: "karakeep-app/karakeep",
  description: "Bookmark organizer",
  language: "TypeScript",
  topics: ["bookmarks"],
  private: false,
};
const response = (repos: unknown[], headers?: HeadersInit) =>
  new Response(JSON.stringify(repos), { headers });

describe("public GitHub Stars connector", () => {
  it.runIf(process.env.SEEDBED_LIVE_GITHUB_TEST === "1")(
    "reads the supplied public profile without saving bookmarks or calling AI",
    async () => {
      const result = await readGitHubStars(url);
      console.log(
        "GitHub public Stars smoke test:",
        JSON.stringify({
          count: result.parsed.bookmarks.length,
          truncated: result.truncated,
          examples: result.parsed.bookmarks.slice(0, 3).map((b) => b.title),
        }),
      );
      expect(result.parsed.bookmarks.length).toBeGreaterThan(0);
    },
    50000,
  );
  it("accepts supported profile URLs and rejects arbitrary hosts and paths", () => {
    expect(parseGitHubStarsUrl(url)).toBe("anduhello");
    for (const invalid of [
      "http://github.com/a?tab=stars",
      "https://localhost/a?tab=stars",
      "https://github.com/a/b?tab=stars",
      "https://github.com/a",
      "https://secret@github.com/a?tab=stars",
      "https://github.com:444/a?tab=stars",
    ])
      expect(() => parseGitHubStarsUrl(invalid)).toThrow();
  });
  it("maps public repository metadata and never follows untrusted URLs", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        response([repo, { ...repo, full_name: "private/repo", private: true }]),
      );
    const result = await readGitHubStars(url, fetcher);
    expect(result.parsed.bookmarks[0]).toMatchObject({
      title: repo.full_name,
      content: { url: "https://github.com/karakeep-app/karakeep" },
      tags: [],
    });
    expect(result.parsed.bookmarks[0].notes).toContain("Bookmark organizer");
    expect(result.skipped).toBe(1);
    expect(fetcher.mock.calls[0][0].hostname).toBe("api.github.com");
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: "error",
      credentials: "omit",
    });
  });
  it("bounds long public descriptions without rejecting the entire list", async () => {
    const result = await readGitHubStars(
      url,
      vi
        .fn()
        .mockResolvedValue(
          response([{ ...repo, description: "x".repeat(55700) }]),
        ),
    );
    expect(result.parsed.bookmarks).toHaveLength(1);
    expect(result.parsed.bookmarks[0].notes?.length).toBeLessThan(4200);
  });
  it("paginates, deduplicates, and handles an empty list", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          Array.from({ length: 100 }, (_, i) => ({
            ...repo,
            full_name: `owner/repo${i}`,
          })),
        ),
      )
      .mockResolvedValueOnce(response([{ ...repo, full_name: "owner/repo0" }]));
    const result = await readGitHubStars(url, fetcher);
    expect(result.parsed.bookmarks).toHaveLength(100);
    expect(result.skipped).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      (await readGitHubStars(url, vi.fn().mockResolvedValue(response([]))))
        .parsed.bookmarks,
    ).toEqual([]);
  });
  it("stops after 500 and clearly reports truncation", async () => {
    const fetcher = vi.fn().mockImplementation((endpoint: URL) =>
      response(
        Array.from({ length: 100 }, (_, i) => ({
          ...repo,
          full_name: `owner/repo${endpoint.searchParams.get("page")}_${i}`,
        })),
        { link: '<https://api.github.com/next>; rel="next"' },
      ),
    );
    const result = await readGitHubStars(url, fetcher);
    expect(result.parsed.bookmarks).toHaveLength(500);
    expect(result.truncated).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
  it("reports quota and missing-user errors without importing anything", async () => {
    await expect(
      readGitHubStars(
        url,
        vi.fn().mockResolvedValue(new Response("", { status: 403 })),
      ),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    await expect(
      readGitHubStars(
        url,
        vi.fn().mockResolvedValue(new Response("", { status: 404 })),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      readGitHubStars(
        url,
        vi
          .fn()
          .mockResolvedValue(response([{ ...repo, full_name: "../../bad" }])),
      ),
    ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
  });
});
