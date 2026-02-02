import { runBPE } from "./bpe";

self.onmessage = (e: MessageEvent<{ text: string; maxMerges?: number }>) => {
  const { text, maxMerges } = e.data;
  const result = runBPE(text, maxMerges);
  self.postMessage(result);
};
