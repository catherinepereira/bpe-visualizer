import type { ReactNode } from "react";

type Props = {
  currentStep: number;
  /** Last valid step index. The control treats the valid range as [0, maxStep]. */
  maxStep: number;
  isPlaying: boolean;
  onSetStep: (step: number) => void;
  onTogglePlay: () => void;
  /** Optional content rendered to the right of the scrubber (e.g. speed selector). */
  rightSlot?: ReactNode;
  /** CSS class to apply to the scrubber input. Defaults to flex-1. */
  scrubberClassName?: string;
  /** When true, the play button is disabled. Defaults to disabling when maxStep === 0. */
  disablePlay?: boolean;
};

const BTN = "px-2 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:cursor-default";
const PLAY_BTN = "px-3 py-1 rounded text-sm bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-default";

export function StepControls({
  currentStep,
  maxStep,
  isPlaying,
  onSetStep,
  onTogglePlay,
  rightSlot,
  scrubberClassName = "flex-1",
  disablePlay,
}: Props) {
  const atStart = currentStep <= 0;
  const atEnd = currentStep >= maxStep;
  const playDisabled = disablePlay ?? maxStep === 0;

  return (
    <div className="flex flex-wrap items-center gap-3 w-full">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSetStep(0)}
          disabled={atStart}
          className={BTN}
          aria-label="Go to start"
        >
          ⏮
        </button>
        <button
          onClick={() => onSetStep(Math.max(0, currentStep - 1))}
          disabled={atStart}
          className={BTN}
          aria-label="Previous step"
        >
          ⏴
        </button>
        <button
          onClick={onTogglePlay}
          disabled={playDisabled}
          className={PLAY_BTN}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button
          onClick={() => onSetStep(Math.min(maxStep, currentStep + 1))}
          disabled={atEnd}
          className={BTN}
          aria-label="Next step"
        >
          ⏵
        </button>
        <button
          onClick={() => onSetStep(maxStep)}
          disabled={atEnd}
          className={BTN}
          aria-label="Go to end"
        >
          ⏭
        </button>
      </div>
      <span className="text-xs text-gray-500 dark:text-zinc-500 min-w-16 font-mono">
        Step {Math.min(currentStep, maxStep)}/{maxStep}
      </span>
      <input
        type="range"
        min={0}
        max={maxStep}
        value={Math.min(currentStep, maxStep)}
        onChange={(e) => onSetStep(parseInt(e.target.value))}
        className={`${scrubberClassName} accent-blue-600 dark:accent-blue-400`}
        aria-label="Scrub through steps"
      />
      {rightSlot}
    </div>
  );
}
