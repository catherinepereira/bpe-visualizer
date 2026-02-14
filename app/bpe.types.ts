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
