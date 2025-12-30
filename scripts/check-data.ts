import { db } from '../src/lib/db/connection';
import { objectOfExpenditure } from '../src/lib/db/schema';
import dotenv from 'dotenv';

dotenv.config();

async function checkData() {
  console.log('Checking object_of_expenditure table...\n');

  const data = await db.select().from(objectOfExpenditure);

  console.log(`Total records: ${data.length}\n`);

  if (data.length > 0) {
    console.log('Sample records:');
    data.slice(0, 5).forEach(item => {
      console.log(`- ID: ${item.id}, Code: ${item.code}, Name: ${item.name}, Category: ${item.category}`);
    });

    console.log('\nGrouped by category:');
    const grouped = data.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(grouped).forEach(([category, count]) => {
      console.log(`- ${category}: ${count} items`);
    });
  } else {
    console.log('No data found in object_of_expenditure table!');
  }

  process.exit(0);
}

checkData();
