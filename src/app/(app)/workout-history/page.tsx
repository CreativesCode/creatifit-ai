"use client";
import { WorkoutHistory } from "@/components/ui/workout-history";
import { useRouter } from "next/navigation";

export default function WorkoutHistoryPage() {
  const router = useRouter();

  const handleBack = () => {
    // Navegar de vuelta a la página anterior o a /plans
    router.push("/plans");
  };

  return <WorkoutHistory onBack={handleBack} />;
}
