"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SimulationExperience } from "@/components/simulation/simulation-experience";
import { hasProfile, hasVariants } from "@/lib/flow-session";

export default function SimulatePage() {
  const router = useRouter();

  useEffect(() => {
    if (!hasProfile()) {
      router.replace("/profile");
    } else if (!hasVariants()) {
      router.replace("/variants");
    }
  }, [router]);

  return <SimulationExperience />;
}
