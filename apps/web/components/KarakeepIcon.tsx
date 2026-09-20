import { useTranslation } from "@/lib/i18n/server";
import Image from "next/image";

export default async function KarakeepLogo({ height }: { height: number }) {
  // Server-side translation helper, not a React hook.
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return (
    <span
      className="flex items-center gap-2 text-xl font-semibold tracking-tight"
      style={{ minHeight: height }}
    >
      <Image
        src="/seedbed/little-soil-mark.png"
        alt=""
        width={38}
        height={38}
        className="size-[38px] object-contain"
        priority
      />
      {t("seedbed.brand")}
    </span>
  );
}
