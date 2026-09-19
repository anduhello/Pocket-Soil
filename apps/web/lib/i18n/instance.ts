import { createInstance } from "i18next";
import type { Resource } from "i18next";
import { getOptions } from "./settings";

// A synchronous, isolated instance keeps SSR and hydration on the same dictionary.
export function createTranslationInstance(lang: string, resources: Resource) {
  const instance = createInstance();
  void instance.init({
    ...getOptions(lang),
    resources,
    initImmediate: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}
