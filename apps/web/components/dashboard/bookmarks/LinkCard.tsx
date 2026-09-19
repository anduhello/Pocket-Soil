"use client";

import Image from "next/image";
import Link from "next/link";
import { useUserSettings } from "@/lib/userSettings";
import { useTranslation } from "@/lib/i18n/client";
import { Skeleton } from "@/components/ui/skeleton";
import { FileWarning, FileText } from "lucide-react";

import type { ZBookmarkTypeLink } from "@karakeep/shared/types/bookmarks";
import {
  getBookmarkLinkImageUrl,
  getBookmarkTitle,
  getSourceUrl,
  isBookmarkStillCrawling,
} from "@karakeep/shared/utils/bookmarkUtils";

import { BookmarkLayoutAdaptingCard } from "./BookmarkLayoutAdaptingCard";
import FooterLinkURL from "./FooterLinkURL";

function isTextOnlyImportedSource(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname === "bilibili.com" ||
      hostname.endsWith(".bilibili.com") ||
      hostname === "b23.tv" ||
      hostname === "github.com" ||
      hostname.endsWith(".github.com")
    );
  } catch {
    return false;
  }
}

const useOnClickUrl = (bookmark: ZBookmarkTypeLink) => {
  const userSettings = useUserSettings();
  return {
    urlTarget:
      userSettings.bookmarkClickAction === "open_original_link"
        ? ("_blank" as const)
        : ("_self" as const),
    onClickUrl:
      userSettings.bookmarkClickAction === "expand_bookmark_preview"
        ? `/dashboard/preview/${bookmark.id}`
        : bookmark.content.url,
  };
};

function LinkTitle({ bookmark }: { bookmark: ZBookmarkTypeLink }) {
  const { onClickUrl, urlTarget } = useOnClickUrl(bookmark);
  const parsedUrl = new URL(bookmark.content.url);
  return (
    <Link href={onClickUrl} target={urlTarget} rel="noreferrer">
      {getBookmarkTitle(bookmark) ?? parsedUrl.host}
    </Link>
  );
}

function LinkImage({
  bookmark,
  className,
}: {
  bookmark: ZBookmarkTypeLink;
  className?: string;
}) {
  const { onClickUrl, urlTarget } = useOnClickUrl(bookmark);
  const link = bookmark.content;
  const { t } = useTranslation();

  const imgComponent = (url: string, unoptimized: boolean) => (
    <Image
      unoptimized={unoptimized}
      className={className}
      alt="card banner"
      fill={true}
      src={url}
    />
  );

  const imageDetails = getBookmarkLinkImageUrl(link);

  let img: React.ReactNode;
  if (isBookmarkStillCrawling(bookmark)) {
    img = (
      <div
        className="flex size-full flex-col justify-center gap-3 bg-muted p-6"
        role="status"
      >
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <p className="text-sm text-muted-foreground">
          {t("seedbed.processing")}
        </p>
      </div>
    );
  } else if (imageDetails) {
    img = imgComponent(imageDetails.url, true);
  } else {
    img = (
      <div className="flex size-full flex-col items-center justify-center gap-3 bg-muted p-6 text-muted-foreground">
        {link.crawlStatus === "failure" ? (
          <FileWarning size={32} />
        ) : (
          <FileText size={32} />
        )}
        <p className="text-center text-sm">
          {link.crawlStatus === "failure"
            ? t("seedbed.read_failed")
            : t("seedbed.no_cover")}
        </p>
      </div>
    );
  }

  return (
    <Link
      href={onClickUrl}
      target={urlTarget}
      rel="noreferrer"
      className={className}
    >
      <div className="relative size-full flex-1">{img}</div>
    </Link>
  );
}

export default function LinkCard({
  bookmark: bookmarkLink,
  className,
  bookmarkIndex,
}: {
  bookmark: ZBookmarkTypeLink;
  className?: string;
  bookmarkIndex?: number;
}) {
  return (
    <BookmarkLayoutAdaptingCard
      title={<LinkTitle bookmark={bookmarkLink} />}
      footer={<FooterLinkURL url={getSourceUrl(bookmarkLink)} />}
      bookmark={bookmarkLink}
      wrapTags={false}
      image={(_layout, className) =>
        isTextOnlyImportedSource(bookmarkLink.content.url) ? null : (
          <LinkImage className={className} bookmark={bookmarkLink} />
        )
      }
      content={
        isTextOnlyImportedSource(bookmarkLink.content.url) &&
        bookmarkLink.note ? (
          <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
            {bookmarkLink.note}
          </p>
        ) : undefined
      }
      className={className}
      bookmarkIndex={bookmarkIndex}
    />
  );
}
