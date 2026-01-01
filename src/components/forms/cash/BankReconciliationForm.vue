<template>
  <div class="bank-reconciliation-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- Bank Account Selection -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Bank Account *</span>
        </label>
        <select v-model="formData.bankAccountId" class="select select-bordered w-full" required>
          <option value="">Select Bank Account</option>
          <option v-for="account in bankAccounts" :key="account.id" :value="account.id">
            {{ account.bankName }} - {{ account.accountNumber }}
          </option>
        </select>
      </div>

      <!-- Reconciliation Period -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="label">
            <span class="label-text">Month *</span>
          </label>
          <select v-model.number="formData.periodMonth" class="select select-bordered w-full" required>
            <option value="">Select Month</option>
            <option v-for="month in months" :key="month.value" :value="month.value">
              {{ month.label }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="label">
            <span class="label-text">Year *</span>
          </label>
          <select v-model.number="formData.periodYear" class="select select-bordered w-full" required>
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
      </div>

      <!-- Reconciliation Date -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Reconciliation Date *</span>
        </label>
        <input
          v-model="formData.reconciliationDate"
          type="date"
          class="input input-bordered w-full"
          required
        />
      </div>

      <!-- Balances -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="label">
            <span class="label-text">Book Balance (Per System) *</span>
          </label>
          <input
            v-model.number="formData.bookBalance"
            type="number"
            step="0.01"
            class="input input-bordered w-full"
            placeholder="0.00"
            required
          />
        </div>

        <div class="form-group">
          <label class="label">
            <span class="label-text">Bank Balance (Per Statement) *</span>
          </label>
          <input
            v-model.number="formData.bankBalance"
            type="number"
            step="0.01"
            class="input input-bordered w-full"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <!-- Outstanding Checks -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Outstanding Checks</span>
          <button type="button" @click="addOutstandingCheck" class="btn btn-xs btn-primary">
            Add Check
          </button>
        </label>

        <div class="space-y-2">
          <div
            v-for="(check, index) in formData.outstandingChecks"
            :key="index"
            class="flex gap-2 items-center p-2 bg-base-200 rounded"
          >
            <input
              v-model="check.checkNo"
              type="text"
              class="input input-sm input-bordered flex-1"
              placeholder="Check No."
            />
            <input
              v-model="check.payee"
              type="text"
              class="input input-sm input-bordered flex-1"
              placeholder="Payee"
            />
            <input
              v-model.number="check.amount"
              type="number"
              step="0.01"
              class="input input-sm input-bordered w-32"
              placeholder="Amount"
            />
            <button type="button" @click="removeOutstandingCheck(index)" class="btn btn-xs btn-error">
              Remove
            </button>
          </div>
          <div v-if="formData.outstandingChecks.length === 0" class="text-sm text-gray-500 italic p-2">
            No outstanding checks
          </div>
          <div class="text-right font-semibold">
            Total: ₱{{ formatCurrency(totalOutstandingChecks) }}
          </div>
        </div>
      </div>

      <!-- Deposits in Transit -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Deposits in Transit</span>
          <button type="button" @click="addDepositInTransit" class="btn btn-xs btn-primary">
            Add Deposit
          </button>
        </label>

        <div class="space-y-2">
          <div
            v-for="(deposit, index) in formData.depositsInTransit"
            :key="index"
            class="flex gap-2 items-center p-2 bg-base-200 rounded"
          >
            <input
              v-model="deposit.date"
              type="date"
              class="input input-sm input-bordered"
            />
            <input
              v-model="deposit.reference"
              type="text"
              class="input input-sm input-bordered flex-1"
              placeholder="Reference/OR No."
            />
            <input
              v-model.number="deposit.amount"
              type="number"
              step="0.01"
              class="input input-sm input-bordered w-32"
              placeholder="Amount"
            />
            <button type="button" @click="removeDepositInTransit(index)" class="btn btn-xs btn-error">
              Remove
            </button>
          </div>
          <div v-if="formData.depositsInTransit.length === 0" class="text-sm text-gray-500 italic p-2">
            No deposits in transit
          </div>
          <div class="text-right font-semibold">
            Total: ₱{{ formatCurrency(totalDepositsInTransit) }}
          </div>
        </div>
      </div>

      <!-- Bank Charges and Interest -->
      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label class="label">
            <span class="label-text">Bank Charges</span>
          </label>
          <input
            v-model.number="formData.bankCharges"
            type="number"
            step="0.01"
            class="input input-bordered w-full"
            placeholder="0.00"
          />
        </div>

        <div class="form-group">
          <label class="label">
            <span class="label-text">Bank Interest</span>
          </label>
          <input
            v-model.number="formData.bankInterest"
            type="number"
            step="0.01"
            class="input input-bordered w-full"
            placeholder="0.00"
          />
        </div>
      </div>

      <!-- Reconciliation Summary -->
      <div class="bg-green-50 p-4 rounded-lg">
        <h3 class="font-semibold mb-3">Reconciliation Summary</h3>

        <div class="grid grid-cols-2 gap-4">
          <!-- Book Balance Side -->
          <div>
            <h4 class="font-medium text-sm mb-2">Book Balance Reconciliation:</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Book Balance:</span>
                <span>₱{{ formatCurrency(formData.bookBalance) }}</span>
              </div>
              <div class="flex justify-between text-green-600">
                <span>Add: Bank Interest</span>
                <span>₱{{ formatCurrency(formData.bankInterest || 0) }}</span>
              </div>
              <div class="flex justify-between text-red-600">
                <span>Less: Bank Charges</span>
                <span>₱{{ formatCurrency(formData.bankCharges || 0) }}</span>
              </div>
              <div class="flex justify-between font-bold border-t pt-1">
                <span>Adjusted Book Balance:</span>
                <span>₱{{ formatCurrency(adjustedBookBalance) }}</span>
              </div>
            </div>
          </div>

          <!-- Bank Balance Side -->
          <div>
            <h4 class="font-medium text-sm mb-2">Bank Balance Reconciliation:</h4>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span>Bank Balance:</span>
                <span>₱{{ formatCurrency(formData.bankBalance) }}</span>
              </div>
              <div class="flex justify-between text-green-600">
                <span>Add: Deposits in Transit</span>
                <span>₱{{ formatCurrency(totalDepositsInTransit) }}</span>
              </div>
              <div class="flex justify-between text-red-600">
                <span>Less: Outstanding Checks</span>
                <span>₱{{ formatCurrency(totalOutstandingChecks) }}</span>
              </div>
              <div class="flex justify-between font-bold border-t pt-1">
                <span>Adjusted Bank Balance:</span>
                <span>₱{{ formatCurrency(adjustedBankBalance) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Variance -->
        <div class="mt-4 pt-4 border-t border-green-200">
          <div class="flex justify-between items-center">
            <span class="font-semibold">Variance:</span>
            <span :class="variance === 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'">
              ₱{{ formatCurrency(Math.abs(variance)) }}
              {{ variance === 0 ? '(Balanced)' : variance > 0 ? '(Book > Bank)' : '(Bank > Book)' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex gap-2 justify-end">
        <button type="button" @click="resetForm" class="btn btn-ghost" :disabled="isSubmitting">
          Reset
        </button>
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="loading loading-spinner"></span>
          {{ isSubmitting ? 'Creating...' : 'Create Reconciliation' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface BankAccount {
  id: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
}

const props = defineProps<{
  bankAccounts: string;
}>();

const parsedBankAccounts = JSON.parse(props.bankAccounts) as BankAccount[];
const bankAccounts = ref<BankAccount[]>(parsedBankAccounts);

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const formData = ref({
  bankAccountId: '',
  periodMonth: new Date().getMonth() + 1,
  periodYear: currentYear,
  reconciliationDate: new Date().toISOString().split('T')[0],
  bookBalance: 0,
  bankBalance: 0,
  outstandingChecks: [] as Array<{ checkNo: string; payee: string; amount: number }>,
  depositsInTransit: [] as Array<{ date: string; reference: string; amount: number }>,
  bankCharges: 0,
  bankInterest: 0,
});

const isSubmitting = ref(false);

const totalOutstandingChecks = computed(() => {
  return formData.value.outstandingChecks.reduce((sum, check) => sum + (check.amount || 0), 0);
});

const totalDepositsInTransit = computed(() => {
  return formData.value.depositsInTransit.reduce((sum, deposit) => sum + (deposit.amount || 0), 0);
});

const adjustedBookBalance = computed(() => {
  return formData.value.bookBalance + (formData.value.bankInterest || 0) - (formData.value.bankCharges || 0);
});

const adjustedBankBalance = computed(() => {
  return formData.value.bankBalance + totalDepositsInTransit.value - totalOutstandingChecks.value;
});

const variance = computed(() => {
  return adjustedBookBalance.value - adjustedBankBalance.value;
});

const addOutstandingCheck = () => {
  formData.value.outstandingChecks.push({ checkNo: '', payee: '', amount: 0 });
};

const removeOutstandingCheck = (index: number) => {
  formData.value.outstandingChecks.splice(index, 1);
};

const addDepositInTransit = () => {
  formData.value.depositsInTransit.push({ date: '', reference: '', amount: 0 });
};

const removeDepositInTransit = (index: number) => {
  formData.value.depositsInTransit.splice(index, 1);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const submitForm = async () => {
  isSubmitting.value = true;

  try {
    const response = await fetch('/api/cash/reconciliations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bankAccountId: Number(formData.value.bankAccountId),
        periodMonth: formData.value.periodMonth,
        periodYear: formData.value.periodYear,
        reconciliationDate: formData.value.reconciliationDate,
        bookBalance: formData.value.bookBalance,
        bankBalance: formData.value.bankBalance,
        outstandingChecks: formData.value.outstandingChecks,
        depositsInTransit: formData.value.depositsInTransit,
        bankCharges: formData.value.bankCharges || undefined,
        bankInterest: formData.value.bankInterest || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create bank reconciliation');
    }

    alert('Bank reconciliation created successfully!');

    // Redirect to reconciliations list
    window.location.href = '/cash/reconciliations';
  } catch (error) {
    console.error('Error creating bank reconciliation:', error);
    alert(`Error: ${error instanceof Error ? error.message : 'Failed to create bank reconciliation'}`);
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    bankAccountId: '',
    periodMonth: new Date().getMonth() + 1,
    periodYear: currentYear,
    reconciliationDate: new Date().toISOString().split('T')[0],
    bookBalance: 0,
    bankBalance: 0,
    outstandingChecks: [],
    depositsInTransit: [],
    bankCharges: 0,
    bankInterest: 0,
  };
};
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}
</style>
