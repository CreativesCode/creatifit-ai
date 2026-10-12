"use client";
/* eslint-disable @next/next/no-img-element */
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDataSaver } from "@/lib/data-saver";
import {
  EXERCISE_PLACEHOLDER,
  exerciseImageUrl,
  exercisePosterUrl,
  exerciseThumbUrl,
} from "@/lib/exercise-media";

/** Miniatura estática para listas. Si no existe, cae al GIF y luego al placeholder. */
export function ExerciseThumb({
  gif,
  alt,
  className,
  style,
}: {
  gif?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const chain = [exerciseThumbUrl(gif), exerciseImageUrl(gif), EXERCISE_PLACEHOLDER].filter(
    Boolean
  ) as string[];
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [gif]);
  return (
    <img
      src={chain[Math.min(step, chain.length - 1)]}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      onError={() => setStep((s) => Math.min(s + 1, chain.length - 1))}
    />
  );
}

/** Animación del ejercicio a tamaño grande. En ahorro de datos muestra la
    imagen fija y descarga el GIF solo cuando se toca "Ver animación". */
export function ExerciseAnimation({
  gif,
  alt,
  className = "w-full h-full object-contain",
}: {
  gif?: string | null;
  alt: string;
  className?: string;
}) {
  const { t } = useTranslation("common");
  const dataSaver = useDataSaver();
  const [play, setPlay] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  useEffect(() => {
    setPlay(false);
    setPosterFailed(false);
    setGifFailed(false);
  }, [gif]);

  const animated = exerciseImageUrl(gif);
  const poster = exercisePosterUrl(gif);
  // Sin imagen fija disponible no hay nada que mostrar en su lugar: va el GIF.
  const showGif = !dataSaver || play || !poster || posterFailed;

  if (!animated || gifFailed) {
    return <img src={EXERCISE_PLACEHOLDER} alt={alt} className={className} />;
  }
  if (showGif) {
    return (
      <img src={animated} alt={alt} className={className} onError={() => setGifFailed(true)} />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlay(true)}
      className="relative w-full h-full block"
      aria-label={t("exercises.play_animation", "Ver animación")}
    >
      <img src={poster!} alt={alt} className={className} onError={() => setPosterFailed(true)} />
      <span
        className="absolute left-1/2 bottom-3 -translate-x-1/2 flex items-center gap-1.5 text-white text-[12.5px] font-bold whitespace-nowrap"
        style={{ padding: "8px 14px", borderRadius: 999, background: "rgba(0,0,0,0.62)" }}
      >
        <Play size={13} fill="currentColor" />
        {t("exercises.play_animation", "Ver animación")}
      </span>
    </button>
  );
}
