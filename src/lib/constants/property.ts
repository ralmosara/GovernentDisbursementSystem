/**
 * PPE capitalization threshold (COA Circular No. 2022-004). Items costing at least this much
 * are PPE, issued on a PAR and depreciated; cheaper items are semi-expendable property,
 * issued on an ICS and expensed when issued.
 */
export const CAPITALIZATION_THRESHOLD = 50000;

/**
 * Property, plant and equipment accounts (Revised Chart of Accounts), each with its
 * accumulated depreciation and depreciation expense account. Land is not depreciated.
 */
export const PPE_ACCOUNTS: { code: string; title: string; accumulated: string | null; depreciation: string | null }[] = [
  { code: '1060101000', title: 'Land', accumulated: null, depreciation: null },
  { code: '1060401000', title: 'Buildings', accumulated: '1060401100', depreciation: '5050104000' },
  { code: '1060501000', title: 'Machinery', accumulated: '1060501100', depreciation: '5050105000' },
  { code: '1060502000', title: 'Office Equipment', accumulated: '1060502100', depreciation: '5050105000' },
  { code: '1060503000', title: 'Information and Communications Technology Equipment', accumulated: '1060503100', depreciation: '5050105000' },
  { code: '1060601000', title: 'Motor Vehicles', accumulated: '1060601100', depreciation: '5050106000' },
  { code: '1060701000', title: 'Furniture and Fixtures', accumulated: '1060701100', depreciation: '5050107000' },
  { code: '1060702000', title: 'Books', accumulated: '1060702100', depreciation: '5050107000' },
];
