"use client";

import { IntakeForm } from "@/components/forms/intake-form";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePlanGenerated = async (planId: string) => {
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
