// Single source of truth for app navigation: the side nav, the top-nav search
// ("Go to…") and the Create menu all read from here.

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavSection {
  id: string;
  title: string;
  icon: string;
  items: NavItem[];
  adminOnly?: boolean;
}

// Things people come here to *do*, phrased as jobs rather than document types
export interface CreateAction extends NavItem {
  description: string;
}

export const homeItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'pi-home' },
  { href: '/approvals', label: 'Pending approvals', icon: 'pi-inbox' },
];

export const navSections: NavSection[] = [
  {
    id: 'budget',
    title: 'Budget',
    icon: 'pi-wallet',
    items: [
      { href: '/budget/appropriations', label: 'Appropriations', icon: 'pi-wallet' },
      { href: '/budget/allotments', label: 'Allotments', icon: 'pi-chart-pie' },
      { href: '/budget/obligations', label: 'Obligations', icon: 'pi-book' },
    ],
  },
  {
    id: 'procurement',
    title: 'Procurement',
    icon: 'pi-shopping-cart',
    items: [
      { href: '/procurement/requests', label: 'Purchase requests', icon: 'pi-list' },
      { href: '/procurement/orders', label: 'Purchase orders', icon: 'pi-file-edit' },
      { href: '/procurement/orders?view=deliveries', label: 'Deliveries (IAR)', icon: 'pi-box' },
    ],
  },
  {
    id: 'accounting',
    title: 'Accounting',
    icon: 'pi-calculator',
    items: [
      { href: '/accounting/journals', label: 'Journal entries (JEV)', icon: 'pi-book' },
      { href: '/accounting/general-ledger', label: 'General ledger', icon: 'pi-list' },
      { href: '/accounting/trial-balance', label: 'Trial balance', icon: 'pi-calculator' },
      { href: '/accounting/chart-of-accounts', label: 'Chart of accounts', icon: 'pi-sitemap' },
      { href: '/accounting/nca', label: 'NCA registry', icon: 'pi-wallet' },
      { href: '/accounting/year-end', label: 'Year-end closing', icon: 'pi-lock' },
    ],
  },
  {
    id: 'disbursements',
    title: 'Disbursements',
    icon: 'pi-file-edit',
    items: [
      { href: '/disbursements', label: 'Disbursement vouchers', icon: 'pi-file-edit' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: 'pi-credit-card',
    items: [
      { href: '/payments/checks', label: 'Check disbursement', icon: 'pi-credit-card' },
      { href: '/payments/ada', label: 'ADA', icon: 'pi-send' },
    ],
  },
  {
    id: 'travel',
    title: 'Travel',
    icon: 'pi-map-marker',
    items: [
      { href: '/travel/itinerary', label: 'Itinerary of travel', icon: 'pi-map-marker' },
      { href: '/travel/liquidation', label: 'Liquidation reports', icon: 'pi-receipt' },
    ],
  },
  {
    id: 'cash',
    title: 'Cash & treasury',
    icon: 'pi-money-bill',
    items: [
      { href: '/cash/receipts', label: 'Cash receipts', icon: 'pi-money-bill' },
      { href: '/cash/deposits', label: 'Bank deposits', icon: 'pi-building-columns' },
      { href: '/cash/reconciliations', label: 'Reconciliation', icon: 'pi-check-square' },
      { href: '/cash/petty-cash', label: 'Petty cash', icon: 'pi-wallet' },
      { href: '/cash/position', label: 'Cash position', icon: 'pi-chart-bar' },
      { href: '/cash/advances', label: 'Cash advances', icon: 'pi-briefcase' },
    ],
  },
  {
    id: 'revenue',
    title: 'Revenue',
    icon: 'pi-chart-line',
    items: [
      { href: '/revenue', label: 'Overview', icon: 'pi-chart-line' },
      { href: '/revenue/entries', label: 'Revenue entries', icon: 'pi-plus-circle' },
      { href: '/revenue/receivables', label: 'Accounts receivable', icon: 'pi-list' },
      { href: '/revenue/collections', label: 'Collections', icon: 'pi-money-bill' },
      { href: '/revenue/sources', label: 'Revenue sources', icon: 'pi-sitemap' },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll',
    icon: 'pi-users',
    items: [
      { href: '/payroll/employees', label: 'Employees', icon: 'pi-users' },
      { href: '/payroll/periods', label: 'Payroll periods', icon: 'pi-calendar' },
      { href: '/payroll/deductions', label: 'Deductions', icon: 'pi-minus-circle' },
      { href: '/payroll/adjustments', label: 'Adjustments', icon: 'pi-sliders-h' },
      { href: '/payroll/remittances', label: 'Remittances', icon: 'pi-send' },
      { href: '/payroll/thirteenth-month', label: '13th month pay', icon: 'pi-gift' },
    ],
  },
  {
    id: 'assets',
    title: 'Assets',
    icon: 'pi-building',
    items: [
      { href: '/assets', label: 'Overview', icon: 'pi-building' },
      { href: '/assets/categories', label: 'Categories', icon: 'pi-tags' },
      { href: '/assets/fixed', label: 'Fixed assets', icon: 'pi-box' },
      { href: '/assets/accountability', label: 'Accountability (PAR/ICS)', icon: 'pi-id-card' },
      { href: '/assets/depreciation', label: 'Depreciation', icon: 'pi-chart-line' },
      { href: '/assets/disposals', label: 'Disposals', icon: 'pi-trash' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: 'pi-shopping-bag',
    items: [
      { href: '/inventory/items', label: 'Items', icon: 'pi-shopping-bag' },
      { href: '/inventory/transactions', label: 'Transactions', icon: 'pi-arrows-h' },
      { href: '/inventory/physical-count', label: 'Physical count', icon: 'pi-clipboard' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'pi-chart-bar',
    items: [
      { href: '/reports', label: 'All reports', icon: 'pi-th-large' },
      { href: '/reports/insights', label: 'Process insights', icon: 'pi-stopwatch' },
      { href: '/reports/bir/taxes-withheld', label: 'BIR: taxes withheld / 2307', icon: 'pi-percentage' },
      { href: '/reports/cash/disbursements-issued', label: 'Checks & ADA issued (RCI/RADAI)', icon: 'pi-credit-card' },
      { href: '/reports/cash/collections-deposits', label: 'Collections & deposits (RCD)', icon: 'pi-money-bill' },
      { href: '/reports/far', label: 'FAR reports', icon: 'pi-chart-bar' },
      { href: '/reports/bar', label: 'BAR reports', icon: 'pi-chart-line' },
      { href: '/reports/assets/listing', label: 'Asset listing', icon: 'pi-building' },
      { href: '/reports/assets/depreciation-summary', label: 'Depreciation summary', icon: 'pi-chart-line' },
      { href: '/reports/assets/disposal-register', label: 'Disposal register', icon: 'pi-trash' },
      { href: '/reports/inventory/stock-card', label: 'Stock card', icon: 'pi-file-edit' },
      { href: '/reports/inventory/low-stock', label: 'Low stock', icon: 'pi-exclamation-triangle' },
      { href: '/reports/inventory/valuation', label: 'Inventory valuation', icon: 'pi-dollar' },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    icon: 'pi-cog',
    adminOnly: true,
    items: [
      { href: '/admin/users', label: 'Users', icon: 'pi-user' },
      { href: '/admin/activity-dashboard', label: 'Activity', icon: 'pi-chart-line' },
      { href: '/audit', label: 'Audit logs', icon: 'pi-history' },
      { href: '/admin/settings', label: 'Settings', icon: 'pi-cog' },
    ],
  },
];

export const createActions: CreateAction[] = [
  {
    href: '/disbursements/create',
    label: 'Disbursement voucher',
    icon: 'pi-file-edit',
    description: 'Pay a supplier, employee or claimant',
  },
  {
    href: '/procurement/requests/create',
    label: 'Purchase request',
    icon: 'pi-shopping-cart',
    description: 'Ask for goods or services to be procured',
  },
  {
    href: '/budget/obligations/create',
    label: 'Obligation request',
    icon: 'pi-book',
    description: 'Commit funds against an allotment',
  },
  {
    href: '/travel/itinerary/create',
    label: 'Travel itinerary',
    icon: 'pi-map-marker',
    description: 'Plan official travel and request an advance',
  },
  {
    href: '/cash/receipts/create',
    label: 'Cash receipt',
    icon: 'pi-money-bill',
    description: 'Record money received by the agency',
  },
  {
    href: '/revenue/collections/create',
    label: 'Collection',
    icon: 'pi-download',
    description: 'Collect against a receivable',
  },
  {
    href: '/cash/reconciliations/create',
    label: 'Bank reconciliation',
    icon: 'pi-check-square',
    description: 'Match the books against the bank statement',
  },
];

export function visibleNavSections(isAdmin: boolean): NavSection[] {
  return navSections.filter(section => !section.adminOnly || isAdmin);
}

// The active item is the one whose href is the longest prefix of the current path,
// so /revenue/entries highlights "Revenue entries", not the Revenue overview.
export function findActiveHref(pathname: string, hrefs: string[]): string | undefined {
  const currentPath = pathname.replace(/\/$/, '') || '/';
  return hrefs
    .filter(href => currentPath === href || currentPath.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}
