"use client";
import { useMemo } from "react";
import type { Resource } from "i18next";
import { createTranslationInstance } from "./instance";
import { I18nextProvider } from "react-i18next";

const CustomI18nextProvider = ({
  lang,
  resources,
  children,
}: {
  lang: string;
  resources: Resource;
  children: React.ReactNode;
}) => {
  const i18n = useMemo(
    () => createTranslationInstance(lang, resources),
    [lang, resources],
  );

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default CustomI18nextProvider;
