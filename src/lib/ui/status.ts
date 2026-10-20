// One mapping from record status to how it is shown, used by every module.
// Appearances follow ADS lozenges: each conveys a kind of state, not a colour choice.

export type LozengeAppearance = 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';

const APPEARANCE_CLASS: Record<LozengeAppearance, string> = {
  default: 'badge',
  inprogress: 'badge badge-info',
  moved: 'badge badge-warning',
  new: 'badge badge-discovery',
  removed: 'badge badge-danger',
  success: 'badge badge-success',
};

const STATUS_APPEARANCE: Record<string, LozengeAppearance> = {
  // Waiting on someone
  pending: 'moved',
  pending_budget: 'moved',
  pending_accounting: 'moved',
  pending_director: 'moved',
  for_approval: 'moved',
  submitted: 'moved',
  returned: 'moved',
  overdue: 'moved',
  partial: 'moved',
  partially_paid: 'moved',
  partially_liquidated: 'moved',
  unliquidated: 'moved',
  low_stock: 'moved',

  // Moving through the process
  issued: 'inprogress',
  released: 'inprogress',
  processing: 'inprogress',
  in_progress: 'inprogress',
  ongoing: 'inprogress',
  open: 'inprogress',
  for_payment: 'inprogress',
  deposited: 'inprogress',

  // Done
  approved: 'success',
  paid: 'success',
  cleared: 'success',
  completed: 'success',
  liquidated: 'success',
  posted: 'success',
  remitted: 'success',
  reconciled: 'success',
  collected: 'success',
  active: 'success',
  closed: 'default',

  // Stopped
  rejected: 'removed',
  cancelled: 'removed',
  voided: 'removed',
  void: 'removed',
  written_off: 'removed',
  disposed: 'removed',
  stale: 'removed',

  // New or not started
  draft: 'default',
  new: 'new',
  inactive: 'default',
};

const LABEL_OVERRIDES: Record<string, string> = {
  pending_budget: 'Pending budget',
  pending_accounting: 'Pending accounting',
  pending_director: 'Pending director',
  written_off: 'Written off',
};

export function statusAppearance(status: string | null | undefined): LozengeAppearance {
  return STATUS_APPEARANCE[(status ?? '').toLowerCase()] ?? 'default';
}

export function lozengeClass(statusOrAppearance: string | null | undefined): string {
  const key = (statusOrAppearance ?? '').toLowerCase();
  if (key in APPEARANCE_CLASS) return APPEARANCE_CLASS[key as LozengeAppearance];
  return APPEARANCE_CLASS[statusAppearance(key)];
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  const key = status.toLowerCase();
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  const words = key.replace(/[_-]+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
