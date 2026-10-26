/**
 * Supplies inventory accounts (Revised Chart of Accounts) and the expense account each is
 * charged to when stock is issued. Stock received against a DV moves from the expense the DV
 * was charged to into inventory, and back to expense as it is issued.
 */
export const SUPPLY_ACCOUNTS: { code: string; title: string; expense: string }[] = [
  { code: '1040401000', title: 'Office Supplies Inventory', expense: '5020301000' },
  { code: '1040402000', title: 'Accountable Forms, Plates and Stickers Inventory', expense: '5020302000' },
  { code: '1040403000', title: 'Non-Accountable Forms Inventory', expense: '5020303000' },
  { code: '1040406000', title: 'Drugs and Medicines Inventory', expense: '5020307000' },
  { code: '1040407000', title: 'Medical, Dental and Laboratory Supplies Inventory', expense: '5020308000' },
  { code: '1040408000', title: 'Fuel, Oil and Lubricants Inventory', expense: '5020309000' },
  { code: '1040499000', title: 'Other Supplies and Materials Inventory', expense: '5020399000' },
];

/** The inventory account a stock item is carried in (Office Supplies when the item names none) */
export function supplyAccountFor(code: string | null | undefined) {
  return SUPPLY_ACCOUNTS.find(a => a.code === code) ?? SUPPLY_ACCOUNTS[0];
}
