"use client";

import { useState } from "react";
import { RuleEditor } from "@/components/dashboard/rules/RuleEngineRuleEditor";
import RuleList from "@/components/dashboard/rules/RuleEngineRuleList";
import {
  SettingsPage,
  SettingsSection,
} from "@/components/settings/SettingsPage";
import { Button } from "@/components/ui/button";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { useTranslation } from "@/lib/i18n/client";
import { useQuery } from "@tanstack/react-query";
import { FolderInput, PlusCircle, Sparkles, Tags } from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";
import { RuleEngineRule } from "@karakeep/shared/types/rules";

export default function RulesSettingsPage() {
  const api = useTRPC();
  const { t } = useTranslation();
  const [editingRule, setEditingRule] = useState<
    (Omit<RuleEngineRule, "id"> & { id: string | null }) | null
  >(null);

  const { data: rules, isLoading } = useQuery(
    api.rules.list.queryOptions(undefined, {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }),
  );

  const handleCreateRule = () => {
    const newRule = {
      id: null,
      name: t("settings.rules.new_rule_name"),
      description: t("settings.rules.new_rule_description"),
      enabled: true,
      event: { type: "bookmarkAdded" as const },
      condition: { type: "alwaysTrue" as const },
      actions: [{ type: "addTag" as const, tagId: "" }],
    };
    setEditingRule(newRule);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (editingRule?.id === ruleId) {
      // If the rule being edited is being deleted, reset the editing rule
      setEditingRule(null);
    }
  };

  return (
    <SettingsPage
      title={t("settings.rules.rules")}
      description={t("settings.rules.description")}
      action={
        <Button onClick={handleCreateRule} variant="default">
          <PlusCircle className="mr-2 h-4 w-4" />
          {t("settings.rules.ceate_rule")}
        </Button>
      }
    >
      <div className="rounded-2xl border bg-secondary/50 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">{t("settings.rules.guide_title")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("settings.rules.guide_description")}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "guide_trigger_title",
              body: "guide_trigger_body",
            },
            {
              icon: Tags,
              title: "guide_condition_title",
              body: "guide_condition_body",
            },
            {
              icon: FolderInput,
              title: "guide_action_title",
              body: "guide_action_body",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className="rounded-xl border bg-background/80 p-4 transition-transform duration-200 hover:-rotate-1 hover:shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2 text-primary">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <item.icon className="size-4" />
              </div>
              <p className="text-sm font-semibold">
                {t(`settings.rules.${item.title}`)}
              </p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {t(`settings.rules.${item.body}`)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-lg bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground">
          <strong className="text-foreground">
            {t("settings.rules.example_title")}
          </strong>{" "}
          {t("settings.rules.example_body")}
        </p>
      </div>
      <SettingsSection>
        {!rules || isLoading ? (
          <FullPageSpinner />
        ) : (
          <RuleList
            rules={rules.rules}
            onEditRule={(r) => setEditingRule(r)}
            onDeleteRule={handleDeleteRule}
          />
        )}
        <div className="lg:col-span-7">
          {editingRule && (
            <RuleEditor
              rule={editingRule}
              onCancel={() => setEditingRule(null)}
            />
          )}
        </div>
      </SettingsSection>
    </SettingsPage>
  );
}
