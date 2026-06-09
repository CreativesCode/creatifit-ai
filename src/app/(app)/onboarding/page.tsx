"use client";

import { IntakeForm } from "@/components/forms/intake-form";
import { type GeneratedPlan } from "@/lib/validators/schemas";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePlanGenerated = async (planId: string, _plan: GeneratedPlan) => {
    router.replace(`/plans?id=${planId}`);
  };

  return (
    <IntakeForm
      onPlanGenerated={handlePlanGenerated}
      isGenerating={isGenerating}
      setIsGenerating={setIsGenerating}
    />
  );
}
