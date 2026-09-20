"use client";

import Image from "next/image";
import { useState } from "react";

const MESSAGES = [
  "今天也来翻翻旧收藏吧",
  "发现一份新养分！",
  "轻轻点我，会长大一点点",
];

export default function SeedlingHedgehogPet() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);

  const greet = () => {
    setMessageIndex((current) => (current + 1) % MESSAGES.length);
    setIsBouncing(true);
    window.setTimeout(() => setIsBouncing(false), 700);
  };

  return (
    <div className="absolute bottom-3 left-1 z-10">
      <button
        type="button"
        onClick={greet}
        className="group relative flex h-32 w-52 items-end justify-start text-left outline-none"
        aria-label="和小刺猬打招呼"
      >
        <span className="absolute -top-5 left-2 max-w-32 rounded-xl border border-primary/15 bg-background/95 px-2 py-1 text-[11px] leading-4 text-muted-foreground opacity-0 shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:opacity-100 group-focus-visible:-translate-y-1 group-focus-visible:opacity-100">
          {MESSAGES[messageIndex]}
        </span>
        <Image
          src="/seedbed/hedgehog-garden-pet.png"
          alt="一只在叶片旁探索的小刺猬"
          width={208}
          height={104}
          className={`h-auto w-52 origin-bottom-left object-contain transition-transform duration-300 group-hover:-rotate-2 group-hover:scale-105 ${
            isBouncing ? "-translate-y-2 rotate-[-4deg]" : ""
          }`}
        />
      </button>
    </div>
  );
}
