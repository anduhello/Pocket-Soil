import { expect, it } from "vitest";
import en from "./locales/en/translation.json";
import zh from "./locales/zh/translation.json";
import { createTranslationInstance } from "./instance";

it("renders the selected language immediately without sharing mutable language state", async () => {
  const resources = { en: { translation: en }, zh: { translation: zh } };
  const chinese = createTranslationInstance("zh", resources);
  const english = createTranslationInstance("en", resources);
  expect(chinese.t("seedbed.library")).toBe("收藏库");
  expect(english.t("seedbed.library")).toBe("Library");
  await english.changeLanguage("zh");
  expect(chinese.language).toBe("zh");
  expect(createTranslationInstance("en", resources).t("seedbed.library")).toBe(
    "Library",
  );
});
