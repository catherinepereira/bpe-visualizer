import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { CreditLine } from "./CreditLine";

type Props = {
  title: string;
  repo: string;
  modelRepo?: string;
  /** Optional blurb paragraph rendered below the header row. Wrap JSX (links, em, etc.) freely. */
  children?: ReactNode;
};

export function SiteHeader({ title, repo, modelRepo, children }: Props) {
  return (
    <>
      <header className="mb-3 flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight font-display">{title}</h1>
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500">
          <ThemeToggle />
          <CreditLine repo={repo} modelRepo={modelRepo} />
        </div>
      </header>
      {children && (
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-5">{children}</p>
      )}
    </>
  );
}
