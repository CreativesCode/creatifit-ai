"use client";

import { IntakeForm } from "@/components/forms/intake-form";
import { Button } from "@/components/ui/button";
import { PlanDisplay } from "@/components/ui/plan-display";
import { type GeneratedPlan } from "@/lib/validators/schemas";
import { useState } from "react";

interface Exercise {
  id: string;
  name: string;
  targetSets: number;
  targetRepsLo: number;
  targetRepsHi: number;
  restSec: number;
  cues: string[];
  exercise: {
    name: string;
    kind: string;
  };
}

interface PlanDay {
  id: string;
  dayIndex: number;
  focus: string;
  items: Exercise[];
}

interface Plan {
  id: string;
  weeks: number;
  version: number;
  createdAt: string;
  payload: any;
  days: PlanDay[];
}

// Mock data para demostración (en un SPA real, esto vendría de localStorage o estado local)

export default function DashboardPage() {
  const [currentView, setCurrentView] = useState<
    "onboarding" | "plan" | "session"
  >("onboarding");
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [currentSet, setCurrentSet] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(
    null
  );
  const [planId, setPlanId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState({
    reps: "",
    load: "",
    rpe: "",
    notes: "",
  });

  const handlePlanGenerated = (planId: string, plan: GeneratedPlan) => {
    console.log("🎯 [DASHBOARD] Plan generated and saved:", planId);
    console.log("📋 [DASHBOARD] Plan structure:", JSON.stringify(plan, null, 2));
    
    // Validar que el plan tenga la estructura correcta antes de establecerlo
    if (!plan || !plan.days || !Array.isArray(plan.days)) {
      console.error("❌ [DASHBOARD] Invalid plan structure:", plan);
      alert("Error: Invalid plan structure received");
      return;
    }
    
    // Validar que cada día tenga bloques válidos
    for (let i = 0; i < plan.days.length; i++) {
      const day = plan.days[i];
      if (!day.blocks || !Array.isArray(day.blocks)) {
        console.error(`❌ [DASHBOARD] Day ${i} missing blocks:`, day);
        alert(`Error: Day ${i} is missing blocks`);
        return;
      }
      
      for (let j = 0; j < day.blocks.length; j++) {
        const block = day.blocks[j];
        if (!block || typeof block.sets !== 'number') {
          console.error(`❌ [DASHBOARD] Block ${j} in day ${i} invalid:`, block);
          alert(`Error: Block ${j} in day ${i} has invalid sets property`);
          return;
        }
      }
    }
    
    console.log("✅ [DASHBOARD] Plan validation passed, setting state");
    setGeneratedPlan(plan);
    setPlanId(planId);
    setCurrentView("plan");
  };

  const handleLogSet = async () => {
    if (!currentExercise || !sessionData.reps) return;

    // Aquí iría la lógica para guardar en localStorage o estado local
    console.log("Logging set:", {
      exerciseId: currentExercise.id,
      setIndex: currentSet,
      reps: parseInt(sessionData.reps),
      load: sessionData.load ? parseFloat(sessionData.load) : undefined,
      rpe: sessionData.rpe ? parseFloat(sessionData.rpe) : undefined,
      notes: sessionData.notes || undefined,
    });

    if (currentSet < currentExercise.targetSets) {
      setCurrentSet((prev) => prev + 1);
      setSessionData({ reps: "", load: "", rpe: "", notes: "" });
    } else {
      alert("Great job! All sets completed.");
      setCurrentView("plan");
    }
  };

  const renderOnboarding = () => (
    <div className="min-h-screen bg-bg py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-txt mb-4">
            Let's Create Your Perfect Plan
          </h1>
          <p className="text-lg text-muted">
            Tell us about your goals and we'll generate a personalized workout
            plan just for you.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-soft p-6 md:p-8">
          <IntakeForm
            onPlanGenerated={(planId, plan) =>
              handlePlanGenerated(planId, plan)
            }
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
        </div>
      </div>
    </div>
  );

  const renderPlan = () => {
    if (!generatedPlan || !planId) return null;

    return (
      <PlanDisplay
        plan={generatedPlan}
        planId={planId}
        onStartSession={() => setCurrentView("session")}
        onBackToForm={() => setCurrentView("onboarding")}
      />
    );
  };

  const renderSession = () => {
    if (!currentExercise) return null;

    return (
      <div className="min-h-screen bg-bg py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-txt mb-4">
              {currentExercise.exercise.name}
            </h1>
            <p className="text-lg text-muted">
              Set {currentSet} of {currentExercise.targetSets}
            </p>
          </div>

          {/* Exercise Info */}
          <div className="bg-surface border border-border rounded-2xl shadow-soft p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
              <div>
                <div className="text-2xl font-bold text-accent">
                  {currentExercise.targetSets}
                </div>
                <div className="text-sm text-muted">Total Sets</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {currentExercise.targetRepsLo}-{currentExercise.targetRepsHi}
                </div>
                <div className="text-sm text-muted">Target Reps</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {currentExercise.restSec}s
                </div>
                <div className="text-sm text-muted">Rest Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {currentExercise.exercise.kind}
                </div>
                <div className="text-sm text-muted">Type</div>
              </div>
            </div>

            {currentExercise.cues && currentExercise.cues.length > 0 && (
              <div className="border-t border-border pt-4">
                <h3 className="text-lg font-semibold text-txt mb-3">
                  Form Cues
                </h3>
                <ul className="list-disc list-inside text-muted space-y-1">
                  {currentExercise.cues.map((cue, index) => (
                    <li key={index}>{cue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Logging Form */}
          <div className="bg-surface border border-border rounded-2xl shadow-soft p-6">
            <h2 className="text-2xl font-semibold text-txt mb-6">
              Log Set {currentSet}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Reps Completed *
                </label>
                <input
                  type="number"
                  value={sessionData.reps}
                  onChange={(e) =>
                    setSessionData((prev) => ({
                      ...prev,
                      reps: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={`${currentExercise.targetRepsLo}-${currentExercise.targetRepsHi}`}
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Weight/Load (kg) - Optional
                </label>
                <input
                  type="number"
                  value={sessionData.load}
                  onChange={(e) =>
                    setSessionData((prev) => ({
                      ...prev,
                      load: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  RPE (Rate of Perceived Exertion) - Optional
                </label>
                <select
                  value={sessionData.rpe}
                  onChange={(e) =>
                    setSessionData((prev) => ({ ...prev, rpe: e.target.value }))
                  }
                  className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select RPE</option>
                  <option value="1">1 - Very Easy</option>
                  <option value="2">2 - Easy</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - Somewhat Hard</option>
                  <option value="5">5 - Hard</option>
                  <option value="6">6 - Harder</option>
                  <option value="7">7 - Very Hard</option>
                  <option value="8">8 - Extremely Hard</option>
                  <option value="9">9 - Maximum Effort</option>
                  <option value="10">10 - Absolute Maximum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-txt mb-2">
                  Notes - Optional
                </label>
                <textarea
                  value={sessionData.notes}
                  onChange={(e) =>
                    setSessionData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="How did this set feel? Any issues with form?"
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button
                onClick={handleLogSet}
                disabled={!sessionData.reps}
                className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-glow"
                size="lg"
              >
                {currentSet < currentExercise.targetSets
                  ? "Log Set & Continue"
                  : "Complete Workout"}
              </Button>

              <Button
                onClick={() => setCurrentView("plan")}
                variant="outline"
                className="border-border hover:bg-surface"
                size="lg"
              >
                Back to Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar la vista actual
  return (
    <>
      {currentView === "onboarding" && renderOnboarding()}
      {currentView === "plan" && renderPlan()}
      {currentView === "session" && renderSession()}
    </>
  );
}
