/** One step of a ProgressTracker */
export interface Step {
  label: string;
  state: 'done' | 'current' | 'todo' | 'failed' | 'skipped';
  /** Secondary line, e.g. who acted and when */
  meta?: string;
  href?: string;
}
