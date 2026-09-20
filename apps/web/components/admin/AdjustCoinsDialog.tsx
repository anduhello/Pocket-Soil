"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins } from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";

export default function AdjustCoinsDialog({
  userId,
  userName,
  currentUnlimited,
}: {
  userId: string;
  userName: string;
  currentUnlimited: boolean;
}) {
  const api = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [freeAmount, setFreeAmount] = useState("");
  const [unlimited, setUnlimited] = useState(currentUnlimited);
  const adjustment = useMutation(
    api.admin.adjustUserCoins.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(api.admin.userStats.pathFilter());
        toast({ description: "AI 点数余额已调整" });
        setAmount("");
        setReason("");
        setOpen(false);
      },
      onError: (error) =>
        toast({ variant: "destructive", description: error.message }),
    }),
  );
  const freeQuotaAdjustment = useMutation(
    api.admin.adjustUserFreeAiQuota.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(api.admin.userStats.pathFilter());
        toast({ description: "免费额度设置已更新" });
        setFreeAmount("");
        setOpen(false);
      },
      onError: (error) =>
        toast({ variant: "destructive", description: error.message }),
    }),
  );
  const parsedAmount = Number(amount);
  const valid =
    Number.isInteger(parsedAmount) &&
    parsedAmount !== 0 &&
    reason.trim().length >= 3;
  const parsedFreeAmount = Number(freeAmount || 0);
  const freeChanged =
    (Number.isInteger(parsedFreeAmount) && parsedFreeAmount !== 0) ||
    unlimited !== currentUnlimited;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="调整 AI 点数">
          <Coins className="size-4 text-amber-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>调整 {userName} 的 AI 点数</DialogTitle>
          <DialogDescription>
            可以发放 AI 点数、额外免费次数，或把内部账号设为永久免费。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor={`coin-amount-${userId}`}>调整数量</Label>
            <Input
              id={`coin-amount-${userId}`}
              type="number"
              step="1"
              placeholder="例如 20 或 -5"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="grid gap-2 border-t pt-4">
            <Label htmlFor={`free-amount-${userId}`}>额外免费次数</Label>
            <Input
              id={`free-amount-${userId}`}
              type="number"
              step="1"
              placeholder="例如 100；负数可收回额度"
              value={freeAmount}
              onChange={(event) => setFreeAmount(event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={unlimited}
                onChange={(event) => setUnlimited(event.target.checked)}
                className="size-4"
              />
              永久免费（AI 标签不扣 AI 点数，也不受次数限制）
            </label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`coin-reason-${userId}`}>调整原因</Label>
            <Input
              id={`coin-reason-${userId}`}
              maxLength={200}
              placeholder="例如：内测用户奖励"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            disabled={
              (!valid && !freeChanged) ||
              adjustment.isPending ||
              freeQuotaAdjustment.isPending
            }
            onClick={async () => {
              if (valid) {
                await adjustment.mutateAsync({
                  userId,
                  amount: parsedAmount,
                  reason: reason.trim(),
                  idempotencyKey: crypto.randomUUID(),
                });
              }
              if (freeChanged) {
                freeQuotaAdjustment.mutate({
                  userId,
                  amount: parsedFreeAmount,
                  unlimitedAiTagging: unlimited,
                });
              }
            }}
          >
            {adjustment.isPending || freeQuotaAdjustment.isPending
              ? "处理中…"
              : "保存计费设置"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
