import React from "react";
import Bookmarks from "@/components/dashboard/bookmarks/Bookmarks";
import LibraryHeader from "@/components/dashboard/bookmarks/LibraryHeader";

export default async function BookmarksPage() {
  return (
    <div>
      <LibraryHeader />
      <Bookmarks query={{ archived: false }} />
    </div>
  );
}
