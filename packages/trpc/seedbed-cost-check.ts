import { suggestSeedbedTags } from "./lib/seedbedTagging";

async function main() {
  let usage: unknown;
  let model: unknown;
  const started = Date.now();
  const tags = await suggestSeedbedTags(
    {
      videos: [
        {
          url: "https://www.bilibili.com/video/BV1u2Ke6hEZk",
          title: "冒险游戏汉化补丁：童话风格游戏体验",
          intro: "介绍冒险游戏的中文汉化补丁与童话风格的游戏体验。",
        },
      ],
    },
    async (url, options) => {
      const response = await fetch(url, options);
      if (response.ok) {
        const payload = await response.clone().json();
        usage = payload.usage;
        model = payload.model;
      }
      return response;
    },
  );
  console.log(
    JSON.stringify({
      sample: "示例标题和简介，非读取视频正文",
      model,
      usage,
      tags,
      elapsedMs: Date.now() - started,
    }),
  );
}
main().catch(() => {
  console.error("Cost check failed; no automatic retry");
  process.exitCode = 1;
});
