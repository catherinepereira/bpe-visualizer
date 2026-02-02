export type Token = string;

export interface BPEStep {
  stepIndex: number;
  mergedPair: [Token, Token] | null;
  frequency: number | null;
  newToken: Token | null;
  tokens: Token[];
}

export interface BPEResult {
  steps: BPEStep[];
}

function countPairs(tokens: Token[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const key = JSON.stringify([tokens[i], tokens[i + 1]]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function mergePair(tokens: Token[], pair: [Token, Token]): Token[] {
  const [a, b] = pair;
  const merged = a + b;
  const result: Token[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (i < tokens.length - 1 && tokens[i] === a && tokens[i + 1] === b) {
      result.push(merged);
      i += 2;
    } else {
      result.push(tokens[i]);
      i++;
    }
  }
  return result;
}

export function runBPE(text: string, maxMerges?: number): BPEResult {
  if (text.length === 0) {
    return { steps: [] };
  }

  let tokens: Token[] = text.split("").map((ch) => (ch === "\n" ? "\\n" : ch));

  const steps: BPEStep[] = [
    {
      stepIndex: 0,
      mergedPair: null,
      frequency: null,
      newToken: null,
      tokens: [...tokens],
    },
  ];

  let stepIndex = 1;
  while (true) {
    const counts = countPairs(tokens);
    if (counts.size === 0) break;

    let bestKey = "";
    let bestFreq = 0;
    for (const [key, freq] of counts) {
      if (freq > bestFreq) {
        bestFreq = freq;
        bestKey = key;
      }
    }

    if (bestFreq < 2) break;
    if (maxMerges !== undefined && stepIndex > maxMerges) break;

    const pair = JSON.parse(bestKey) as [Token, Token];
    tokens = mergePair(tokens, pair);

    steps.push({
      stepIndex,
      mergedPair: pair,
      frequency: bestFreq,
      newToken: pair[0] + pair[1],
      tokens: [...tokens],
    });

    stepIndex++;
  }

  return { steps };
}
