import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CircleHelp,
  Leaf,
  ShieldCheck,
  Sprout,
} from "lucide-react";

const sections = [
  {
    icon: Sprout,
    title: "从收藏到养分",
    body: "把 B站公开收藏夹、GitHub Stars 或链接导入收藏库。导入预览支持逐条勾选：不想保留的内容取消勾选即可，原网站内容不会被删除。",
  },
  {
    icon: Leaf,
    title: "标签怎样帮你找到内容",
    body: "标签是小土壤的主要索引。你可以手动添加，也可以让 AI 建议标签；中文界面会生成简体中文标签。收藏库每天会推荐一个已有标签，帮你重新看见曾经保存的内容。",
  },
  {
    icon: CircleHelp,
    title: "AI 点数说明",
    body: "AI 点数只用于站内的 AI 整理，例如匹配标签；不能转赠或提现。系统会先使用免费的首次导入额度，AI 执行失败时会自动退回本次扣除的点数。你无需也不能为此配置个人 API 密钥。",
  },
  {
    icon: BookOpen,
    title: "学习档案与 RSS",
    body: "学完或使用过一条内容后，将它标记为完成，它会进入学习档案并记录时间。RSS 用于订阅博客或资讯站的更新地址，不用于导入 B站或 GitHub 收藏夹。",
  },
  {
    icon: ShieldCheck,
    title: "备份与数据安全",
    body: "目前可创建并下载自己的备份。正式上线前，自动备份会迁移到加密的私有云端存储，并保留一键导出，让你始终拥有自己的数据副本。",
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/dashboard/bookmarks"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        返回收藏库
      </Link>
      <header className="rounded-3xl border border-primary/15 bg-[#f1f5e8] px-7 py-8 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-primary">
          小土壤 · 使用手册 1.0
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          把收藏养成真正用得上的养分
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          这是当前版本最重要的使用说明。功能仍在生长中，我们会持续更新这份手册。
        </p>
      </header>
      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        {sections.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="rounded-2xl border bg-card p-5 shadow-sm transition duration-200 hover:-rotate-[0.35deg] hover:border-primary/25 hover:shadow-md"
          >
            <Icon className="mb-4 size-5 text-primary" />
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {body}
            </p>
          </article>
        ))}
      </section>
      <footer className="mt-8 rounded-2xl border border-dashed border-primary/25 p-5 text-sm text-muted-foreground">
        发现问题或想提交建议？请前往{" "}
        <a
          href="https://github.com/anduhello"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline underline-offset-4"
        >
          GitHub 反馈主页
        </a>
        。
      </footer>
    </main>
  );
}
