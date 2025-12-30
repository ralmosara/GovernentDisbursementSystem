/**
 * Object of Expenditure Constants
 * Based on Philippine Unified Accounts Code Structure (UACS)
 * Reference: COA Chart of Accounts and GAM Volume II
 */

export const EXPENDITURE_CATEGORIES = {
  PERSONNEL_SERVICES: 'personnel_services',
  MOOE: 'mooe', // Maintenance and Other Operating Expenses
  FINANCIAL_EXPENSES: 'financial_expenses',
  CAPITAL_OUTLAYS: 'capital_outlays',
} as const;

export const EXPENDITURE_CATEGORY_NAMES = {
  [EXPENDITURE_CATEGORIES.PERSONNEL_SERVICES]: 'Personnel Services',
  [EXPENDITURE_CATEGORIES.MOOE]: 'Maintenance and Other Operating Expenses (MOOE)',
  [EXPENDITURE_CATEGORIES.FINANCIAL_EXPENSES]: 'Financial Expenses',
  [EXPENDITURE_CATEGORIES.CAPITAL_OUTLAYS]: 'Capital Outlays',
} as const;

export type ExpenditureCategory = typeof EXPENDITURE_CATEGORIES[keyof typeof EXPENDITURE_CATEGORIES];

/**
 * Common UACS Codes for Object of Expenditure
 */
export const UACS_CODES = {
  // Personnel Services (5-01-XX-XXX)
  BASIC_SALARY_CIVILIAN: '5-01-01-010',
  BASIC_SALARY_MILITARY: '5-01-01-020',
  PERA: '5-01-02-010',
  REPRESENTATION_ALLOWANCE: '5-01-03-010',
  TRANSPORTATION_ALLOWANCE: '5-01-03-020',
  OTHER_BONUSES: '5-01-04-990',

  // MOOE (5-02-XX-XXX)
  TRAVELING_LOCAL: '5-02-01-010',
  TRAVELING_FOREIGN: '5-02-01-020',
  SUPPLIES_MATERIALS: '5-02-03-010',
  OFFICE_SUPPLIES: '5-02-03-050',
  WATER: '5-02-04-010',
  ELECTRICITY: '5-02-04-020',
  POSTAGE: '5-02-05-010',
  TELEPHONE: '5-02-05-020',
  INTERNET: '5-02-05-030',
  TRAINING: '5-02-11-010',
  REPAIRS_BUILDINGS: '5-02-12-010',
  REPAIRS_VEHICLES: '5-02-12-020',
  REPAIRS_EQUIPMENT: '5-02-12-030',

  // Financial Expenses (5-03-XX-XXX)
  INTEREST_EXPENSES: '5-03-01-010',
  BANK_CHARGES: '5-03-02-010',

  // Capital Outlays (5-06-XX-XXX)
  LAND: '5-06-01-010',
  BUILDINGS: '5-06-02-010',
  MACHINERY_EQUIPMENT: '5-06-03-010',
  TRANSPORTATION_EQUIPMENT: '5-06-04-010',
  FURNITURE_FIXTURES: '5-06-05-010',
  OFFICE_EQUIPMENT: '5-06-06-010',
  ICT_EQUIPMENT: '5-06-07-010',
} as const;

/**
 * UACS Code Descriptions
 */
export const UACS_DESCRIPTIONS = {
  [UACS_CODES.BASIC_SALARY_CIVILIAN]: 'Basic Salary - Civilian',
  [UACS_CODES.BASIC_SALARY_MILITARY]: 'Basic Salary - Military and Uniformed Personnel',
  [UACS_CODES.PERA]: 'Personnel Economic Relief Allowance (PERA)',
  [UACS_CODES.REPRESENTATION_ALLOWANCE]: 'Representation Allowance',
  [UACS_CODES.TRANSPORTATION_ALLOWANCE]: 'Transportation Allowance',
  [UACS_CODES.OTHER_BONUSES]: 'Other Bonuses and Allowances',

  [UACS_CODES.TRAVELING_LOCAL]: 'Traveling Expenses - Local',
  [UACS_CODES.TRAVELING_FOREIGN]: 'Traveling Expenses - Foreign',
  [UACS_CODES.SUPPLIES_MATERIALS]: 'Supplies and Materials Expenses',
  [UACS_CODES.OFFICE_SUPPLIES]: 'Office Supplies Expenses',
  [UACS_CODES.WATER]: 'Water Expenses',
  [UACS_CODES.ELECTRICITY]: 'Electricity Expenses',
  [UACS_CODES.POSTAGE]: 'Postage and Courier Services',
  [UACS_CODES.TELEPHONE]: 'Telephone Expenses',
  [UACS_CODES.INTERNET]: 'Internet Subscription Expenses',
  [UACS_CODES.TRAINING]: 'Training Expenses',
  [UACS_CODES.REPAIRS_BUILDINGS]: 'Repairs and Maintenance - Buildings',
  [UACS_CODES.REPAIRS_VEHICLES]: 'Repairs and Maintenance - Vehicles',
  [UACS_CODES.REPAIRS_EQUIPMENT]: 'Repairs and Maintenance - Equipment',

  [UACS_CODES.INTEREST_EXPENSES]: 'Interest Expenses',
  [UACS_CODES.BANK_CHARGES]: 'Bank Charges',

  [UACS_CODES.LAND]: 'Land',
  [UACS_CODES.BUILDINGS]: 'Buildings',
  [UACS_CODES.MACHINERY_EQUIPMENT]: 'Machinery and Equipment',
  [UACS_CODES.TRANSPORTATION_EQUIPMENT]: 'Transportation Equipment',
  [UACS_CODES.FURNITURE_FIXTURES]: 'Furniture and Fixtures',
  [UACS_CODES.OFFICE_EQUIPMENT]: 'Office Equipment',
  [UACS_CODES.ICT_EQUIPMENT]: 'ICT Equipment',
} as const;
