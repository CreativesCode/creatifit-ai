"use client";

import { Button } from "@/components/ui/button";
import { EQUIPMENT_BY_CATEGORY } from "@/lib/constants/equipment";
import { supabaseClient } from "@/lib/supabase-client";
import { type GeneratedPlan, type Intake } from "@/lib/validators/schemas";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface IntakeFormProps {
  onPlanGenerated: (planId: string, plan: GeneratedPlan) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
}

export function IntakeForm({
  onPlanGenerated,
  isGenerating,
  setIsGenerating,
}: IntakeFormProps) {
  const { t } = useTranslation("common");

  const [formData, setFormData] = useState<Partial<Intake>>({
    objective: "general_health",
    level: "beginner",
    gender: "other",
    age: 25,
    weightKg: 70,
    heightCm: 170,
    equipment: {},
    stepsDay: 8000,
    weeks: 8,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof Intake, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleEquipmentChange = (equipment: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        [equipment]: checked,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.objective) newErrors.objective = t("validation.required");
    if (!formData.level) newErrors.level = t("validation.required");
    if (!formData.gender) newErrors.gender = t("validation.required");
    if (!formData.age || formData.age < 16 || formData.age > 80) {
      newErrors.age = t("validation.age_range");
    }
    if (
      !formData.weightKg ||
      formData.weightKg < 30 ||
      formData.weightKg > 200
    ) {
      newErrors.weightKg = t("validation.weight_range");
    }
    if (
      !formData.heightCm ||
      formData.heightCm < 120 ||
      formData.heightCm > 250
    ) {
      newErrors.heightCm = t("validation.height_range");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsGenerating(true);

    try {
      console.log(
        "🚀 [INTAKE FORM] Starting plan generation with data:",
        JSON.stringify(formData, null, 2)
      );

      // Preparar datos para la API
      const apiData = {
        weeks: formData.weeks || 8,
        objective: formData.objective,
        level: formData.level,
        gender: formData.gender,
        age: formData.age,
        weightKg: formData.weightKg,
        heightCm: formData.heightCm,
        equipment: formData.equipment,
        stepsDay: formData.stepsDay,
        constraints: {
          jumps: false, // Por defecto
          high_impact: false,
          heavy_lifting: false,
        },
      };

      console.log(
        "📤 [INTAKE FORM] Sending data to API:",
        JSON.stringify(apiData, null, 2)
      );

      // Generar plan usando OpenAI directamente
      console.log("🤖 [INTAKE FORM] Generating plan with OpenAI...");

      const { generateFitnessPlan } = await import("@/lib/ai/openai");
      const generatedPlan = await generateFitnessPlan(apiData);

      console.log("✅ [INTAKE FORM] Plan generated successfully");
      console.log(
        "📋 [INTAKE FORM] Generated plan details:",
        JSON.stringify(generatedPlan, null, 2)
      );

      // Validar que el plan tenga la estructura correcta
      if (
        !generatedPlan ||
        !generatedPlan.days ||
        !Array.isArray(generatedPlan.days)
      ) {
        console.error(
          "❌ [INTAKE FORM] Invalid plan structure:",
          generatedPlan
        );
        throw new Error("Plan structure is invalid - missing days array");
      }

      // Validar que cada día tenga bloques válidos
      for (let i = 0; i < generatedPlan.days.length; i++) {
        const day = generatedPlan.days[i];
        if (!day.blocks || !Array.isArray(day.blocks)) {
          console.error(`❌ [INTAKE FORM] Day ${i} missing blocks:`, day);
          throw new Error(`Day ${i} is missing blocks array`);
        }

        for (let j = 0; j < day.blocks.length; j++) {
          const block = day.blocks[j];
          if (!block || typeof block.sets !== "number") {
            console.error(
              `❌ [INTAKE FORM] Block ${j} in day ${i} invalid:`,
              block
            );
            throw new Error(`Block ${j} in day ${i} has invalid sets property`);
          }
        }
      }

      console.log("✅ [INTAKE FORM] Plan structure validation passed");

      // Guardar el plan en la base de datos
      console.log("💾 [INTAKE FORM] Saving plan to database...");

      try {
        // Generar un ID único para el plan
        const planId = crypto.randomUUID();

        const savedPlan = await supabaseClient.savePlan({
          id: planId,
          user_id: null, // Temporal: sin autenticación por ahora
          weeks: formData.weeks || 8,
          version: 1,
          source_hash: planId, // Usar el planId como hash por ahora
          payload: {
            // Metadatos del plan
            meta: {
              name: `Plan de ${formData.objective} - ${formData.level}`,
              description: `Plan personalizado de ${formData.weeks} semanas para ${formData.objective}`,
              objective: formData.objective,
              level: formData.level,
              gender: formData.gender,
              age: formData.age,
              weight_kg: formData.weightKg,
              height_cm: formData.heightCm,
              equipment: formData.equipment,
              steps_day: formData.stepsDay,
              constraints: formData.constraints || {},
              created_at: new Date().toISOString(),
            },
            // Datos generados del plan
            ...generatedPlan,
          },
        });

        if (savedPlan) {
          console.log("✅ [INTAKE FORM] Plan saved to database successfully");
          onPlanGenerated(planId, generatedPlan);
        } else {
          throw new Error("Failed to save plan to database");
        }
      } catch (saveError) {
        console.error(
          "💥 [INTAKE FORM] Error saving plan to database:",
          saveError
        );
        throw new Error("Failed to save plan to database");
      }
    } catch (error) {
      console.error("💥 [INTAKE FORM] Error generating plan:", error);
      setErrors({ submit: t("validation.submit_error") });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Objective */}
      <div>
        <label className="block text-sm font-medium text-txt mb-2">
          {t("onboarding.objective.label")}
        </label>
        <select
          value={formData.objective}
          onChange={(e) => handleInputChange("objective", e.target.value)}
          className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="fat_loss">{t("onboarding.objective.fat_loss")}</option>
          <option value="muscle_gain">
            {t("onboarding.objective.muscle_gain")}
          </option>
          <option value="body_recomposition">
            {t("onboarding.objective.body_recomposition")}
          </option>
          <option value="strength">{t("onboarding.objective.strength")}</option>
          <option value="power">{t("onboarding.objective.power")}</option>
          <option value="endurance">
            {t("onboarding.objective.endurance")}
          </option>
          <option value="mobility">{t("onboarding.objective.mobility")}</option>
          <option value="rehabilitation">
            {t("onboarding.objective.rehabilitation")}
          </option>
          <option value="sports_performance">
            {t("onboarding.objective.sports_performance")}
          </option>
          <option value="functional_fitness">
            {t("onboarding.objective.functional_fitness")}
          </option>
          <option value="general_health">
            {t("onboarding.objective.general_health")}
          </option>
        </select>
        {errors.objective && (
          <p className="text-danger text-sm mt-1">{errors.objective}</p>
        )}
      </div>

      {/* Level */}
      <div>
        <label className="block text-sm font-medium text-txt mb-2">
          {t("onboarding.level.label")}
        </label>
        <select
          value={formData.level}
          onChange={(e) => handleInputChange("level", e.target.value)}
          className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="beginner">{t("onboarding.level.beginner")}</option>
          <option value="intermediate">
            {t("onboarding.level.intermediate")}
          </option>
          <option value="advanced">{t("onboarding.level.advanced")}</option>
        </select>
        {errors.level && (
          <p className="text-danger text-sm mt-1">{errors.level}</p>
        )}
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-txt mb-2">
          {t("onboarding.personal.gender")}
        </label>
        <select
          value={formData.gender || "other"}
          onChange={(e) => handleInputChange("gender", e.target.value)}
          className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="male">{t("onboarding.personal.gender_male")}</option>
          <option value="female">
            {t("onboarding.personal.gender_female")}
          </option>
          <option value="other">{t("onboarding.personal.gender_other")}</option>
        </select>
        {errors.gender && (
          <p className="text-danger text-sm mt-1">{errors.gender}</p>
        )}
      </div>

      {/* Age, Weight, Height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-txt mb-2">
            {t("onboarding.personal.age")}
          </label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => handleInputChange("age", parseInt(e.target.value))}
            className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
            min="16"
            max="80"
          />
          {errors.age && (
            <p className="text-danger text-sm mt-1">{errors.age}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-txt mb-2">
            {t("onboarding.personal.weight")}
          </label>
          <input
            type="number"
            value={formData.weightKg}
            onChange={(e) =>
              handleInputChange("weightKg", parseFloat(e.target.value))
            }
            className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
            min="30"
            max="200"
            step="0.1"
          />
          {errors.weightKg && (
            <p className="text-danger text-sm mt-1">{errors.weightKg}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-txt mb-2">
            {t("onboarding.personal.height")}
          </label>
          <input
            type="number"
            value={formData.heightCm}
            onChange={(e) =>
              handleInputChange("heightCm", parseInt(e.target.value))
            }
            className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
            min="120"
            max="250"
          />
          {errors.heightCm && (
            <p className="text-danger text-sm mt-1">{errors.heightCm}</p>
          )}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <label className="block text-sm font-medium text-txt mb-3">
          {t("onboarding.equipment.label")}
        </label>

        {/* Basic Equipment */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted mb-2">
            {t("onboarding.equipment.categories.basic")}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EQUIPMENT_BY_CATEGORY.basic.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-center space-x-2 group cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={
                    !!formData.equipment?.[
                      key as keyof typeof formData.equipment
                    ]
                  }
                  onChange={(e) => handleEquipmentChange(key, e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-txt font-medium">{label}</span>
                  <span className="text-xs text-muted group-hover:text-txt transition-colors">
                    {description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Resistance Equipment */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted mb-2">
            {t("onboarding.equipment.categories.resistance")}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EQUIPMENT_BY_CATEGORY.resistance.map(
              ({ key, label, description }) => (
                <label
                  key={key}
                  className="flex items-center space-x-2 group cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={
                      !!formData.equipment?.[
                        key as keyof typeof formData.equipment
                      ]
                    }
                    onChange={(e) =>
                      handleEquipmentChange(key, e.target.checked)
                    }
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-txt font-medium">
                      {label}
                    </span>
                    <span className="text-xs text-muted group-hover:text-txt transition-colors">
                      {description}
                    </span>
                  </div>
                </label>
              )
            )}
          </div>
        </div>

        {/* Weight Equipment */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted mb-2">
            {t("onboarding.equipment.categories.weight")}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EQUIPMENT_BY_CATEGORY.weight.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-center space-x-2 group cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={
                    !!formData.equipment?.[
                      key as keyof typeof formData.equipment
                    ]
                  }
                  onChange={(e) => handleEquipmentChange(key, e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-txt font-medium">{label}</span>
                  <span className="text-xs text-muted group-hover:text-txt transition-colors">
                    {description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Specialized Equipment */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted mb-2">
            {t("onboarding.equipment.categories.specialized")}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EQUIPMENT_BY_CATEGORY.specialized.map(
              ({ key, label, description }) => (
                <label
                  key={key}
                  className="flex items-center space-x-2 group cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={
                      !!formData.equipment?.[
                        key as keyof typeof formData.equipment
                      ]
                    }
                    onChange={(e) =>
                      handleEquipmentChange(key, e.target.checked)
                    }
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-txt font-medium">
                      {label}
                    </span>
                    <span className="text-xs text-muted group-hover:text-txt transition-colors">
                      {description}
                    </span>
                  </div>
                </label>
              )
            )}
          </div>
        </div>
      </div>

      {/* Plan Duration */}
      <div>
        <label className="block text-sm font-medium text-txt mb-2">
          {t("onboarding.weeks.label")}
        </label>
        <select
          value={formData.weeks || 8}
          onChange={(e) => handleInputChange("weeks", parseInt(e.target.value))}
          className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value={6}>6 {t("plan.weeks")}</option>
          <option value={8}>8 {t("plan.weeks")}</option>
          <option value={10}>10 {t("plan.weeks")}</option>
          <option value={12}>12 {t("plan.weeks")}</option>
        </select>
      </div>

      {/* Daily Steps */}
      <div>
        <label className="block text-sm font-medium text-txt mb-2">
          {t("onboarding.steps.label")}
        </label>
        <input
          type="number"
          value={formData.stepsDay}
          onChange={(e) =>
            handleInputChange("stepsDay", parseInt(e.target.value))
          }
          className="w-full p-3 border border-border rounded-lg bg-bg text-txt focus:ring-2 focus:ring-primary focus:border-transparent"
          min="1000"
          max="20000"
          step="1000"
        />
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <p className="text-danger text-sm text-center">{errors.submit}</p>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isGenerating}
        className="w-full bg-primary hover:bg-primary/90 text-white shadow-glow"
        size="lg"
      >
        {isGenerating ? t("onboarding.generating") : t("onboarding.submit")}
      </Button>
    </form>
  );
}
