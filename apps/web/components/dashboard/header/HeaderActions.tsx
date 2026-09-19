"use client";
import { usePathname } from "next/navigation";
import GlobalActions from "@/components/dashboard/GlobalActions";
export default function HeaderActions() {
  return usePathname() === "/dashboard/bookmarks" ? null : <GlobalActions />;
}
