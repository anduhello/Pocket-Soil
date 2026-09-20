import Link from "next/link";
import { redirect } from "next/navigation";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import HeaderActions from "./HeaderActions";
import ProfileOptions from "@/components/dashboard/header/ProfileOptions";
import WalletPill from "@/components/dashboard/header/WalletPill";
import { SearchInput } from "@/components/dashboard/search/SearchInput";
import KarakeepLogo from "@/components/KarakeepIcon";
import { getServerAuthSession } from "@/server/auth";

export default async function Header() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/");
  }

  return (
    <header className="sticky left-0 right-0 top-0 z-50 flex h-16 w-full min-w-0 items-center gap-3 border-b bg-background px-4">
      <div className="hidden shrink-0 items-center sm:flex">
        <Link href={"/dashboard/bookmarks"} className="w-[188px]">
          <KarakeepLogo height={38} />
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 gap-2">
        <SearchInput className="rounded-md bg-card" />
        <HeaderActions />
      </div>
      <WalletPill />
      <LanguageSwitcher />
      <div className="flex shrink-0 items-center">
        <ProfileOptions />
      </div>
    </header>
  );
}
