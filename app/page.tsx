"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import type { BPEResult, BPEStep, Token } from "./bpe";

type ViewMode = "text" | "utf8";

function tokenToUtf8(token: string): string {
  const bytes = new TextEncoder().encode(token);
  return Array.from(bytes).join(" ");
}

const TOKEN_COLORS = [
  "bg-[#ffdfdf]",
  "bg-[#dfe7ff]",
  "bg-[#d6f5d6]",
  "bg-[#fff3d6]",
  "bg-[#eedcff]",
  "bg-[#ffd6ec]",
  "bg-[#d6eeff]",
  "bg-[#d6fff6]",
  "bg-[#ffe8d6]",
  "bg-[#f0f0d6]",
];

function tokenColor(token: string): string {
  let hash = 0;
  for (const ch of token) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TOKEN_COLORS[Math.abs(hash) % TOKEN_COLORS.length];
}

const TokenChip = memo(function TokenChip({
  token,
  isNew,
  viewMode,
  dimmed,
  onClick,
}: {
  token: Token;
  isNew: boolean;
  viewMode: ViewMode;
  dimmed: boolean;
  onClick?: () => void;
}) {
  const isWhitespace = /^(\\n| )+$/.test(token);
  const display =
    viewMode === "utf8"
      ? tokenToUtf8(token.replace(/\\n/g, "\n"))
      : token.replace(/\\n/g, "↵");
  return (
    <span
      onClick={onClick}
      className={`
        inline font-mono text-sm leading-7 px-0.5 py-0.5 border-r border-black/10 break-all transition-opacity duration-150
        ${isWhitespace ? "bg-gray-100 text-gray-400 text-xs" : tokenColor(token)}
        ${isNew ? "token-new" : ""}
        ${viewMode === "utf8" && !isWhitespace ? "text-xs tracking-wider" : ""}
        ${dimmed ? "opacity-20" : ""}
        cursor-pointer
      `}
    >
      {display}
    </span>
  );
});

function TokenDisplay({
  step,
  viewMode,
  selectedToken,
  onSelectToken,
}: {
  step: BPEStep;
  viewMode: ViewMode;
  selectedToken: string | null;
  onSelectToken: (token: string | null) => void;
}) {
  const handleClick = useCallback(
    (token: string) => {
      onSelectToken(selectedToken === token ? null : token);
    },
    [selectedToken, onSelectToken],
  );

  return (
    <div
      className={`break-all overflow-hidden ${viewMode === "utf8" ? "leading-9" : "leading-8"}`}
    >
      {step.tokens.map((token, ti) => {
        const hasNewline = token.includes("\\n");
        return (
          <span key={`${ti}-${token}`}>
            <TokenChip
              token={token}
              isNew={step.newToken !== null && token === step.newToken}
              viewMode={viewMode}
              dimmed={selectedToken !== null && token !== selectedToken}
              onClick={() => handleClick(token)}
            />
            {hasNewline && <br />}
          </span>
        );
      })}
    </div>
  );
}

function formatToken(token: string, viewMode: ViewMode): string {
  if (viewMode === "utf8") return tokenToUtf8(token.replace(/\\n/g, "\n"));
  return token.replace(/\\n/g, "↵");
}

function MergeList({
  steps,
  currentStep,
  onSelectStep,
  viewMode,
}: {
  steps: BPEStep[];
  currentStep: number;
  onSelectStep: (step: number) => void;
  viewMode: ViewMode;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentStep]);

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[600px] pr-1">
      {steps.map((step) => {
        const isActive = step.stepIndex === currentStep;
        return (
          <button
            key={step.stepIndex}
            ref={isActive ? activeRef : null}
            onClick={() => onSelectStep(step.stepIndex)}
            className={`
              text-left px-3 py-1.5 rounded text-sm transition-colors cursor-pointer
              ${
                isActive
                  ? "bg-blue-50 border-l-3 border-blue-500 font-medium"
                  : "hover:bg-gray-50 border-l-3 border-transparent"
              }
            `}
          >
            {step.stepIndex === 0 ? (
              <span className="text-gray-500">Initial characters</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 w-6 text-xs">
                  {step.stepIndex}
                </span>
                <code className="text-xs bg-gray-100 px-1 rounded">
                  {formatToken(step.mergedPair![0], viewMode)}
                </code>
                <span className="text-gray-400">+</span>
                <code className="text-xs bg-gray-100 px-1 rounded">
                  {formatToken(step.mergedPair![1], viewMode)}
                </code>
                <span className="text-gray-400">&rarr;</span>
                <code className="text-xs bg-blue-50 px-1 rounded font-semibold text-blue-700">
                  {formatToken(step.newToken!, viewMode)}
                </code>
                <span className="text-gray-400 text-xs ml-auto">
                  &times;{step.frequency}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StepControls({
  currentStep,
  totalSteps,
  isPlaying,
  onSetStep,
  onTogglePlay,
}: {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onSetStep: (step: number) => void;
  onTogglePlay: () => void;
}) {
  const maxStep = totalSteps - 1;
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSetStep(0)}
          disabled={currentStep === 0}
          className="px-2 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Go to start"
        >
          &#x23EE;
        </button>
        <button
          onClick={() => onSetStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-2 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Previous step"
        >
          &#x23F4;
        </button>
        <button
          onClick={onTogglePlay}
          disabled={maxStep === 0}
          className="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-default"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button
          onClick={() => onSetStep(Math.min(maxStep, currentStep + 1))}
          disabled={currentStep === maxStep}
          className="px-2 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Next step"
        >
          &#x23F5;
        </button>
        <button
          onClick={() => onSetStep(maxStep)}
          disabled={currentStep === maxStep}
          className="px-2 py-1 rounded text-sm disabled:opacity-30 hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Go to end"
        >
          &#x23ED;
        </button>
      </div>
      <span className="text-xs text-gray-500 min-w-16">
        Step {currentStep}/{maxStep}
      </span>
      <input
        type="range"
        min={0}
        max={maxStep}
        value={currentStep}
        onChange={(e) => onSetStep(Number(e.target.value))}
        className="flex-1 accent-blue-600"
      />
    </div>
  );
}

function Stats({
  inputText,
  bpeResult,
  currentStep,
}: {
  inputText: string;
  bpeResult: BPEResult | null;
  currentStep: number;
}) {
  const charCount = inputText.trim().length;
  const mergeCount = bpeResult ? bpeResult.steps.length - 1 : 0;
  const tokenCount = bpeResult ? bpeResult.steps[currentStep].tokens.length : 0;

  return (
    <div className="flex gap-6 text-sm">
      <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg">
        <span className="text-lg font-bold text-gray-900">{charCount}</span>
        <span className="text-xs text-gray-500">Characters</span>
      </div>
      <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-lg">
        <span className="text-lg font-bold text-gray-900">{mergeCount}</span>
        <span className="text-xs text-gray-500">Merges</span>
      </div>
      <div className="flex flex-col items-center px-4 py-2 bg-blue-50 rounded-lg">
        <span className="text-lg font-bold text-blue-700">{tokenCount}</span>
        <span className="text-xs text-gray-500">Tokens</span>
      </div>
    </div>
  );
}

function TokenInfoPanel({
  token,
  count,
  onClear,
}: {
  token: string;
  count: number;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 w-44">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Selected Token
        </h2>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
        >
          &times;
        </button>
      </div>
      <div className="flex flex-col items-center gap-3 py-2">
        <span
          className={`inline-block font-mono text-lg px-3 py-1.5 rounded ${tokenColor(token)}`}
        >
          {token}
        </span>
        <div className="text-center">
          <span className="text-2xl font-bold text-gray-900">{count}</span>
          <span className="text-xs text-gray-500 block">
            {count === 1 ? "occurrence" : "occurrences"}
          </span>
        </div>
      </div>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute top-2 right-2 z-10">
      <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Home() {
  const [inputText, setInputText] = useState(
    "In computing, byte-pair encoding (BPE), or digram coding, is an algorithm, first described in 1994 by Philip Gage, for encoding strings of text into smaller strings by creating and using a translation table. A slightly modified version of the algorithm is used in large language model tokenizers.",
  );
  const [maxMerges, setMaxMerges] = useState("");
  const [bpeResult, setBpeResult] = useState<BPEResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("text");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const totalSteps = bpeResult?.steps.length ?? 0;
  const parsedMaxMerges =
    maxMerges === "" ? undefined : parseInt(maxMerges, 10);
  const validMaxMerges =
    parsedMaxMerges !== undefined &&
    !isNaN(parsedMaxMerges) &&
    parsedMaxMerges > 0
      ? parsedMaxMerges
      : undefined;

  const clearPlayInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || totalSteps === 0) {
      clearPlayInterval();
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 700);

    return clearPlayInterval;
  }, [isPlaying, totalSteps, clearPlayInterval]);

  useEffect(() => {
    const trimmed = inputText.trim();

    const raf = requestAnimationFrame(() => {
      if (!trimmed) {
        setBpeResult(null);
        setCurrentStep(0);
        setIsPlaying(false);
        setIsLoading(false);
        setSelectedToken(null);
        return;
      }

      setIsLoading(true);
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      const worker = new Worker(new URL("./bpe.worker.ts", import.meta.url));
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<BPEResult>) => {
        setBpeResult(e.data);
        setCurrentStep(0);
        setIsPlaying(false);
        setIsLoading(false);
        setSelectedToken(null);
        worker.terminate();
        if (workerRef.current === worker) {
          workerRef.current = null;
        }
      };

      worker.postMessage({ text: trimmed, maxMerges: validMaxMerges });
    });

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [inputText, validMaxMerges]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  function handleSetStep(step: number) {
    setCurrentStep(step);
    setIsPlaying(false);
  }

  function handleTogglePlay() {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentStep >= totalSteps - 1) {
        setCurrentStep(0);
      }
      setIsPlaying(true);
    }
  }

  const currentStepData = bpeResult?.steps[currentStep] ?? null;
  const selectedTokenCount =
    selectedToken && currentStepData
      ? currentStepData.tokens.filter((t) => t === selectedToken).length
      : 0;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">BPE Visualizer</h1>
          <div className="relative">
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="w-8 h-8 rounded-full border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 flex items-center justify-center text-sm font-medium transition-colors cursor-pointer"
              aria-label="About"
            >
              ?
            </button>
            {showInfo && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowInfo(false)}
                />
                <div className="absolute right-0 top-10 z-40 w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-4 text-sm text-gray-700 leading-relaxed">
                  <p className="font-semibold mb-2 underline">
                    {" "}
                    <a
                      href="https://en.wikipedia.org/wiki/Byte-pair_encoding"
                      target="_blank"
                    >
                      Byte Pair Encoding (BPE)
                    </a>
                    {/* minor to-do: add arrow indicating off-site link */}
                  </p>
                  <p>
                    BPE is a tokenization algorithm that iteratively merges the
                    most frequent pair of adjacent tokens. It starts with
                    individual characters and builds up a vocabulary of subword
                    tokens. This visualizer lets you step through each merge to
                    see how the algorithm works.
                  </p>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Input */}
        <div className="mb-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to tokenize..."
            rows={3}
            maxLength={10000}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* Stats and step controls row */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <Stats
            inputText={inputText}
            bpeResult={bpeResult}
            currentStep={currentStep}
          />
          <div className="flex-1 max-w-xl flex items-center gap-3">
            <StepControls
              currentStep={currentStep}
              totalSteps={totalSteps}
              isPlaying={isPlaying}
              onSetStep={handleSetStep}
              onTogglePlay={handleTogglePlay}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-xs text-gray-400 whitespace-nowrap">
                Max
              </label>
              <input
                type="number"
                min={1}
                value={maxMerges}
                onChange={(e) => setMaxMerges(e.target.value)}
                placeholder="∞"
                className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Merges list */}
          <div className="relative rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              Merges ({bpeResult ? bpeResult.steps.length - 1 : 0})
            </h2>
            {bpeResult && bpeResult.steps.length > 0 ? (
              <MergeList
                steps={bpeResult.steps}
                currentStep={currentStep}
                onSelectStep={handleSetStep}
                viewMode={viewMode}
              />
            ) : (
              <p className="text-sm text-gray-300 py-4 text-center">
                {isLoading ? "\u00A0" : "No merges yet"}
              </p>
            )}
            {isLoading && <LoadingOverlay />}
          </div>

          {/* Token display */}
          <div className="relative rounded-lg border border-gray-200 bg-white p-6 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Tokens
              </h2>
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    viewMode === "text"
                      ? "bg-white text-gray-900 shadow-sm font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setViewMode("utf8")}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    viewMode === "utf8"
                      ? "bg-white text-gray-900 shadow-sm font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  UTF-8
                </button>
              </div>
            </div>
            {currentStepData ? (
              <TokenDisplay
                step={currentStepData}
                viewMode={viewMode}
                selectedToken={selectedToken}
                onSelectToken={setSelectedToken}
              />
            ) : (
              <p className="text-sm text-gray-300 py-8 text-center">
                {isLoading ? "\u00A0" : "Enter text above to see tokens"}
              </p>
            )}
            {isLoading && <LoadingOverlay />}
            {/* Token info popup */}
            {selectedToken && (
              <div className="absolute top-4 -right-48 z-20">
                <TokenInfoPanel
                  token={selectedToken}
                  count={selectedTokenCount}
                  onClear={() => setSelectedToken(null)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pb-4 text-xs text-gray-400">
          made by{" "}
          <span className="text-gray-500 underline">
            <a href="https://github.com/catherinepereira" target="_blank">
              catherinepereira
            </a>
          </span>
          , code at{" "}
          <span className="text-gray-500 underline">
            <a
              href="https://github.com/catherinepereira/bpe-visualizer"
              target="_blank"
            >
              bpe-visualizer
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
