"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { IntakeForm } from "@/components/forms/intake-form";
import { type GeneratedPlan } from "@/lib/validators/schemas";
import { PlanDisplay } from "@/components/ui/plan-display";

export default function OnboardingPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePlanGenerated = async (planId: string, generatedPlan: GeneratedPlan) => {
    setPlan(generatedPlan);
    setPlanId(planId);
    
    // Redirigir automáticamente a la página de detalles del plan
    router.replace(`/plans?id=${planId}`);
  };

  const handleBackToForm = () => {
    setPlan(null);
    setPlanId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-surface to-bg">
      <div className="container mx-auto px-4 py-8">
        {!plan ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-txt mb-4">
                {t("onboarding.title")}
              </h1>
              <p className="text-xl text-muted">
                {t("onboarding.subtitle")}
              </p>
            </div>
            
            <IntakeForm 
              onPlanGenerated={handlePlanGenerated}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          </div>
        ) : (
          <PlanDisplay
            plan={plan}
            planId={planId!}
            onStartSession={() => {}}
            onBackToForm={handleBackToForm}
            useRouter={false}
          />
        )}
      </div>
    </div>
  );
}
