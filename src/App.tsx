import { useState, useEffect, useRef, useCallback, memo } from "react";
import BpeWorker from "./bpe.worker.ts?worker";
import type { BPEResult, BPEStep, Token } from "./bpe.types";
import { BYTE_TO_UNICODE } from "./bpe";
import { SiteHeader } from "./SiteHeader";
import { StepControls } from "./StepControls";

type ViewMode = "text" | "utf8";

const GPT2_NEWLINE = BYTE_TO_UNICODE.get(0x0a)!;
const GPT2_SPACE = BYTE_TO_UNICODE.get(0x20)!;
const RE_NEWLINE = new RegExp(GPT2_NEWLINE, "g");
const RE_SPACE = new RegExp(GPT2_SPACE, "g");
const RE_WHITESPACE = new RegExp(`^[${GPT2_SPACE}${GPT2_NEWLINE}]+$`);

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
  const isWhitespace = RE_WHITESPACE.test(token);
  const display =
    viewMode === "utf8"
      ? tokenToUtf8(token)
      : token.replace(RE_NEWLINE, "↵").replace(RE_SPACE, " ");
  return (
    <span
      onClick={onClick}
      className={`
        inline font-mono text-sm leading-7 px-0.5 py-0.5 border-r border-black/10 break-all transition-opacity duration-150
        ${isWhitespace ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 text-xs" : `${tokenColor(token)} text-gray-900`}
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
        const hasNewline = token.includes(GPT2_NEWLINE);
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
  if (viewMode === "utf8") return tokenToUtf8(token);
  return token.replace(RE_NEWLINE, "↵").replace(RE_SPACE, " ");
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
                  ? "bg-blue-50 dark:bg-blue-950/30 border-l-3 border-blue-500 dark:border-blue-500 font-medium"
                  : "hover:bg-gray-50 dark:hover:bg-zinc-800/40 border-l-3 border-transparent"
              }
            `}
          >
            {step.stepIndex === 0 ? (
              <span className="text-gray-500 dark:text-zinc-500">Initial characters</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 dark:text-zinc-500 w-6 text-xs">
                  {step.stepIndex}
                </span>
                <code className="text-xs bg-gray-100 dark:bg-zinc-800 px-1 rounded">
                  {formatToken(step.mergedPair![0], viewMode)}
                </code>
                <span className="text-gray-400 dark:text-zinc-500">+</span>
                <code className="text-xs bg-gray-100 dark:bg-zinc-800 px-1 rounded">
                  {formatToken(step.mergedPair![1], viewMode)}
                </code>
                <span className="text-gray-400 dark:text-zinc-500">&rarr;</span>
                <code className="text-xs bg-blue-50 dark:bg-blue-950/30 px-1 rounded font-semibold text-blue-700 dark:text-blue-300">
                  {formatToken(step.newToken!, viewMode)}
                </code>
                <span className="text-gray-400 dark:text-zinc-500 text-xs ml-auto">
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
      <div className="flex flex-col items-center px-4 py-2 bg-gray-50 dark:bg-zinc-800/40 rounded-lg">
        <span className="text-lg font-bold text-gray-900 dark:text-zinc-100">{charCount}</span>
        <span className="text-xs text-gray-500 dark:text-zinc-500">Characters</span>
      </div>
      <div className="flex flex-col items-center px-4 py-2 bg-gray-50 dark:bg-zinc-800/40 rounded-lg">
        <span className="text-lg font-bold text-gray-900 dark:text-zinc-100">{mergeCount}</span>
        <span className="text-xs text-gray-500 dark:text-zinc-500">Merges</span>
      </div>
      <div className="flex flex-col items-center px-4 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
        <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{tokenCount}</span>
        <span className="text-xs text-gray-500 dark:text-zinc-500">Tokens</span>
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
    <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 w-44">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
          Selected Token
        </h2>
        <button
          onClick={onClear}
          className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 text-xs cursor-pointer"
        >
          &times;
        </button>
      </div>
      <div className="flex flex-col items-center gap-3 py-2">
        <span
          className={`inline-block font-mono text-lg px-3 py-1.5 rounded ${tokenColor(token)}`}
        >
          {token.replace(RE_NEWLINE, "↵").replace(RE_SPACE, "␣")}
        </span>
        <div className="text-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{count}</span>
          <span className="text-xs text-gray-500 dark:text-zinc-500 block">
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
      <div className="h-5 w-5 border-2 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
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

      const worker = new BpeWorker();
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
    <div className="min-h-screen bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <SiteHeader title="BPE Playground" repo="bpe-playground">
          <a
            href="https://en.wikipedia.org/wiki/Byte-pair_encoding"
            target="_blank"
            className="underline text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-zinc-100"
          >
            Byte Pair Encoding
          </a>{" "}
          is a tokenization algorithm that iteratively merges the most frequent
          pair of adjacent tokens. This visualizer uses the GPT-2 variant, which
          starts from individual bytes (via a byte-to-unicode mapping) and builds
          up a vocabulary of subword tokens. Step through each merge to see how
          the algorithm works.
        </SiteHeader>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mb-5">
          Sources:{" "}
          <a
            href="https://web.archive.org/web/20160326050037/http://www.csse.monash.edu.au/cluster/RJK/Compress/problem.html"
            target="_blank"
            className="underline hover:text-gray-700 dark:hover:text-zinc-300"
          >
            Gage (1994)
          </a>
          {" · "}
          <a
            href="https://arxiv.org/abs/1508.07909"
            target="_blank"
            className="underline hover:text-gray-700 dark:hover:text-zinc-300"
          >
            Sennrich et al. (2016) for NMT
          </a>
          {" · "}
          <a
            href="https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf"
            target="_blank"
            className="underline hover:text-gray-700 dark:hover:text-zinc-300"
          >
            GPT-2 byte-level BPE
          </a>
        </p>

        <div className="mb-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to tokenize..."
            rows={3}
            maxLength={10000}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <Stats
            inputText={inputText}
            bpeResult={bpeResult}
            currentStep={currentStep}
          />
          <div className="flex-1 max-w-xl flex items-center gap-3">
            <StepControls
              currentStep={currentStep}
              maxStep={Math.max(0, totalSteps - 1)}
              isPlaying={isPlaying}
              onSetStep={handleSetStep}
              onTogglePlay={handleTogglePlay}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-xs text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                Max
              </label>
              <input
                type="number"
                min={1}
                value={maxMerges}
                onChange={(e) => setMaxMerges(e.target.value)}
                placeholder="∞"
                className="w-16 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="relative rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-zinc-500 mb-2 uppercase tracking-wide">
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
              <p className="text-sm text-gray-300 dark:text-zinc-600 py-4 text-center">
                {isLoading ? "\u00A0" : "No merges yet"}
              </p>
            )}
            {isLoading && <LoadingOverlay />}
          </div>

          <div className="relative rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">
                Tokens
              </h2>
              <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    viewMode === "text"
                      ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm font-medium"
                      : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setViewMode("utf8")}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    viewMode === "utf8"
                      ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 shadow-sm font-medium"
                      : "text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
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
              <p className="text-sm text-gray-300 dark:text-zinc-600 py-8 text-center">
                {isLoading ? "\u00A0" : "Enter text above to see tokens"}
              </p>
            )}
            {isLoading && <LoadingOverlay />}
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

      </div>
    </div>
  );
}
