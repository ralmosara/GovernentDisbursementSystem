import { db } from '../src/lib/db/connection';
import { payments, disbursementVouchers } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkPayments() {
  console.log('Checking payments in database...\n');
  
  const allPayments = await db
    .select({
      id: payments.id,
      dvId: payments.dvId,
      dvNo: disbursementVouchers.dvNo,
      paymentType: payments.paymentType,
      status: payments.status,
      amount: payments.amount,
      checkNo: payments.checkNo,
    })
    .from(payments)
    .innerJoin(disbursementVouchers, eq(payments.dvId, disbursementVouchers.id));

  console.log(`Total payments: ${allPayments.length}\n`);
  
  allPayments.forEach(p => {
    console.log(`Payment #${p.id}: ${p.dvNo} - ${p.paymentType} - ${p.status} - ₱${p.amount} - Check: ${p.checkNo || 'N/A'}`);
  });
  
  const pending = allPayments.filter(p => p.status === 'pending');
  console.log(`\nPending payments: ${pending.length}`);
  
  process.exit(0);
}

checkPayments().catch(console.error);
