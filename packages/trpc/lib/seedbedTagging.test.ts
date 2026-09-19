import { describe, expect, it, vi } from "vitest";
import { suggestSeedbedTags, zSeedbedTaggingInput } from "./seedbedTagging";

const input = {
  videos: [
    {
      url: "https://www.bilibili.com/video/BV1u2Ke6hEZk",
      title: "设计参考",
      intro: "界面设计教程",
    },
  ],
};
const env = {
  SEEDBED_AI_API_KEY: "test-key-not-real",
  SEEDBED_AI_BASE_URL: "https://api.deepseek.com",
  SEEDBED_AI_MODEL: "deepseek-flash",
};
const reply = (items: unknown[]) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ items }) } }],
    }),
  );

describe("Seedbed optional AI suggestions", () => {
  it("reuses standard library names after format normalization", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        reply([{ id: 0, tags: ["UI设计", "UI 设计", "动效"] }]),
      );
    expect(
      (await suggestSeedbedTags(input, fetcher, env, ["UI 设计"]))[0].tags,
    ).toEqual(["UI 设计", "动效"]);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.messages[0].content).toContain("UI 设计");
  });
  it("requests 3–5 evidence-based tags but permits sparse evidence", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        reply([{ id: 0, tags: ["界面设计", "交互设计", "设计教程"] }]),
      );
    const tags = await suggestSeedbedTags(input, fetcher, env);
    expect(tags[0].tags).toHaveLength(3);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.messages[1].content).toContain("建议3到5个不同");
    expect(body.messages[1].content).toContain("不能为了凑数编造");
  });
  it("does not call providers without a key", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(suggestSeedbedTags(input, fetcher, {})).rejects.toThrow(
      "尚未配置",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends only titles, descriptions and local IDs; returns validated unique tags", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      reply([
        { id: 0, tags: ["界面设计", "界面设计"] },
        { id: 4, tags: ["无关"] },
      ]),
    );
    expect(await suggestSeedbedTags(input, fetcher, env)).toEqual([
      { url: input.videos[0].url, tags: ["界面设计"] },
    ]);
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(JSON.parse(body.messages[2].content)).toEqual([
      { id: 0, title: "设计参考", description: "界面设计教程" },
    ]);
    expect(body.max_tokens).toBe(3000);
    expect(body.thinking).toEqual({ type: "disabled" });
  });
  it("rejects malformed tags without retrying or exposing provider errors", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply([{ id: 0, tags: ["<script>bad</script>"] }]));
    await expect(suggestSeedbedTags(input, fetcher, env)).rejects.toThrow(
      "未自动重试",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("bounds input size and limits the provider batch to 50 videos", () => {
    expect(
      zSeedbedTaggingInput.safeParse({
        videos: Array(51).fill(input.videos[0]),
      }).success,
    ).toBe(false);
    expect(
      zSeedbedTaggingInput.safeParse({
        videos: [{ ...input.videos[0], intro: "a".repeat(1201) }],
      }).success,
    ).toBe(false);
  });
});
