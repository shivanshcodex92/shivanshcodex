"use client";

import { useEffect } from "react";
import { watchAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsub = watchAuth((u) => {
      if (u) router.replace("/app");
      else router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  return null;
}
