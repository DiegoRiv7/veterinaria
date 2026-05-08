"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PetSwitcher,
  type PetSwitcherItem,
} from "@/components/client/PetSwitcher";

export function PetSwitcherWithRefresh({
  items,
  activeId,
}: {
  items: PetSwitcherItem[];
  activeId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function pick(id: string) {
    document.cookie = `activePetId=${id}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return <PetSwitcher pets={items} activeId={activeId} onSelect={pick} />;
}
