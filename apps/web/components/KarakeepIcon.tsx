import { useTranslation } from "@/lib/i18n/server";

export default async function KarakeepLogo({ height }: { height: number }) {
  // Server-side translation helper, not a React hook.
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return (
    <span
      className="flex items-center text-xl font-semibold tracking-tight"
      style={{ minHeight: height }}
    >
      {t("seedbed.brand")}
    </span>
  );
}
