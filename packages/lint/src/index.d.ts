export interface Problem {
  /** The rule that found it, such as "missing-name". */
  rule: string;
  severity: 'error' | 'warning';
  /** What is wrong, in plain words. */
  message: string;
  /** The exact change that fixes it. */
  fix: string;
  line: number;
  column: number;
  /** The start of the offending markup. */
  snippet: string;
}

export interface LintResult {
  problems: Problem[];
  errorCount: number;
  warningCount: number;
}

/** Lints HTML that uses Vastu components. Uses the bundled manifest and tokens unless others are given. */
export function lint(html: string, options?: { manifest?: object; tokens?: object }): LintResult;

/** Formats problems as file:line:col severity rule message, each followed by its fix. */
export function format(problems: Problem[], file?: string): string;

/** Every rule, with its severity and what it checks. */
export const rules: Record<string, { severity: 'error' | 'warning'; description: string }>;
