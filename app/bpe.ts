import type { Token, BPEResult, BPEStep } from "./bpe.types";
export type { Token, BPEStep, BPEResult } from "./bpe.types";

const PAIR_SEP = "\0";
const TEXT_ENCODER = new TextEncoder();
export const BYTE_TO_UNICODE = bytesToUnicode();

/**
 * GPT-2 pre-tokenization regex pattern
 *
 * https://github.com/openai/gpt-2/blob/9b63575ef42771a015060c964af2c3da4cf7c8ab/src/encoder.py#L53
 */
const GPT2_PAT =
  /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

/**
 * From GPT-2 bytes_to_unicode mapping
 *
 * Maps each byte (0-255) to a unicode character and avoids whitespace/control characters
 *
 * https://github.com/openai/gpt-2/blob/9b63575ef42771a015060c964af2c3da4cf7c8ab/src/encoder.py#L19
 */
function bytesToUnicode(): Map<number, string> {
  const bs: number[] = [];
  const cs: number[] = [];

  // ASCII range
  for (let i = "!".charCodeAt(0); i <= "~".charCodeAt(0); i++) {
    bs.push(i);
    cs.push(i);
  }
  // Latin-1 range
  for (let i = "¡".charCodeAt(0); i <= "¬".charCodeAt(0); i++) {
    bs.push(i);
    cs.push(i);
  }
  for (let i = "®".charCodeAt(0); i <= "ÿ".charCodeAt(0); i++) {
    bs.push(i);
    cs.push(i);
  }

  // Map remaining bytes to characters starting at U+0100
  const bsSet = new Set(bs);
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bsSet.has(b)) {
      bs.push(b);
      cs.push(256 + n);
      n++;
    }
  }

  const result = new Map<number, string>();
  for (let i = 0; i < bs.length; i++) {
    result.set(bs[i], String.fromCharCode(cs[i]));
  }
  return result;
}

/**
 * Encode a text chunk into byte-level unicode tokens using GPT-2's mapping
 */
function encodeChunk(chunk: string): Token[] {
  const bytes = TEXT_ENCODER.encode(chunk);
  return Array.from(bytes).map((b) => BYTE_TO_UNICODE.get(b)!);
}

function countPairsAcrossChunks(chunks: Token[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tokens of chunks) {
    for (let i = 0; i < tokens.length - 1; i++) {
      const key = tokens[i] + PAIR_SEP + tokens[i + 1];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function mergePairInChunk(tokens: Token[], pair: [Token, Token]): Token[] {
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

  // Step 1: GPT-2 regex pre-tokenization
  const matches = text.match(GPT2_PAT);
  if (!matches || matches.length === 0) {
    return { steps: [] };
  }

  // Step 2: Byte-level encoding for each chunk
  let chunks: Token[][] = matches.map((chunk) => encodeChunk(chunk));

  const steps: BPEStep[] = [
    {
      stepIndex: 0,
      mergedPair: null,
      frequency: null,
      newToken: null,
      tokens: chunks.flat(),
    },
  ];

  let stepIndex = 1;
  while (true) {
    const counts = countPairsAcrossChunks(chunks);
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

    const pair = bestKey.split(PAIR_SEP) as [Token, Token];
    chunks = chunks.map((chunk) => mergePairInChunk(chunk, pair));

    steps.push({
      stepIndex,
      mergedPair: pair,
      frequency: bestFreq,
      newToken: pair[0] + pair[1],
      tokens: chunks.flat(),
    });

    stepIndex++;
  }

  return { steps };
}
