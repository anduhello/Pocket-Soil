import { describe, expect, it } from "vitest";
import en from "../i18n/locales/en/translation.json";
import zh from "../i18n/locales/zh/translation.json";
import { defaultUserLocalSettings, parseUserLocalSettings } from "./types";

describe("Seedbed interface preferences", () => {
  it("defaults new browsers to Chinese and a three-column grid", () => {
    expect(defaultUserLocalSettings()).toMatchObject({
      lang: "zh",
      bookmarkGridLayout: "grid",
      gridColumns: 3,
    });
  });
  it("preserves existing browser preferences instead of resetting them", () => {
    expect(
      parseUserLocalSettings(
        JSON.stringify({
          lang: "en",
          bookmarkGridLayout: "masonry",
          gridColumns: 4,
        }),
      ),
    ).toMatchObject({
      lang: "en",
      bookmarkGridLayout: "masonry",
      gridColumns: 4,
    });
  });
  it("handles damaged preferences without throwing", () => {
    expect(parseUserLocalSettings("not-json")).toBeUndefined();
  });
  it("provides matching Chinese and English keys and interpolation variables", () => {
    expect(Object.keys(en.seedbed).sort()).toEqual(
      Object.keys(zh.seedbed).sort(),
    );
    for (const key of Object.keys(en.seedbed) as (keyof typeof en.seedbed)[]) {
      expect(en.seedbed[key].match(/\{\{.*?\}\}/g)?.sort() ?? []).toEqual(
        zh.seedbed[key].match(/\{\{.*?\}\}/g)?.sort() ?? [],
      );
    }
  });
});
