"use client";
import { type GeneratedPlan } from "@/lib/validators/schemas";
import { useTranslation } from "react-i18next";
import { Button } from "./button";

interface PlanDisplayProps {
  plan: GeneratedPlan;
  planId: string;
  onStartSession: () => void;
  onBackToForm: () => void;
}

export function PlanDisplay({
  plan,
  planId,
  onStartSession,
  onBackToForm,
}: PlanDisplayProps) {
  const { t } = useTranslation("common");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-txt mb-2">{t("plan.title")}</h1>
        <p className="text-muted text-lg">
          {plan.weeks} {t("plan.weeks")} • {plan.days.length} {t("plan.day")}s
        </p>
        <div className="mt-4 inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">AI Generated</span>
        </div>
      </div>

      {/* Plan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plan.days.map((day) => (
          <div
            key={day.day}
            className="bg-surface border border-border rounded-2xl p-6 hover:shadow-soft transition-shadow"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
                {day.day}
              </div>
              <h3 className="text-lg font-semibold text-txt">{day.focus}</h3>
            </div>

            <div className="space-y-3">
              {day.blocks.map((block, index) => (
                <div
                  key={index}
                  className="bg-bg/50 rounded-lg p-3 border border-border/50"
                >
                  <h4 className="font-medium text-txt text-sm mb-2">
                    {block.name}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      {block.sets} {t("plan.sets")}
                    </span>
                    <span>
                      {block.reps[0]}-{block.reps[1]} {t("plan.reps")}
                    </span>
                    <span>
                      {block.rest_sec}s {t("plan.rest")}
                    </span>
                  </div>
                  {block.cues && block.cues.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-accent font-medium mb-1">
                        Cues:
                      </p>
                      <ul className="text-xs text-muted space-y-1">
                        {block.cues.map((cue, cueIndex) => (
                          <li key={cueIndex} className="flex items-start">
                            <span className="text-accent mr-1">•</span>
                            {cue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-txt mb-4 text-center">
          Weekly Schedule
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center">
              <div className="text-sm font-medium text-muted mb-1">{day}</div>
              <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold mx-auto">
                {day === "Mon"
                  ? "A"
                  : day === "Wed"
                  ? "B"
                  : day === "Fri"
                  ? "C"
                  : day === "Sun"
                  ? "D"
                  : "—"}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-muted">
          <p>Week 1-{plan.weeks}: A → B → C → D (repeat)</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={onStartSession}
          className="bg-primary hover:bg-primary/90 text-white shadow-glow px-8 py-3 text-lg"
          size="lg"
        >
          {t("plan.start_session")}
        </Button>
        <Button
          onClick={onBackToForm}
          variant="outline"
          className="px-8 py-3 text-lg"
          size="lg"
        >
          {t("plan.back_to_plan")}
        </Button>
      </div>

      {/* Plan ID */}
      <div className="text-center text-xs text-muted">Plan ID: {planId}</div>
    </div>
  );
}
