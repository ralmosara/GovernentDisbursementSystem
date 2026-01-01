<template>
  <div class="bank-deposit-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- Bank Account Selection -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Bank Account *</span>
        </label>
        <select v-model="formData.bankAccountId" class="select select-bordered w-full" required>
          <option value="">Select Bank Account</option>
          <option v-for="account in bankAccounts" :key="account.id" :value="account.id">
            {{ account.bankName }} - {{ account.accountNumber }} ({{ account.accountName }})
          </option>
        </select>
      </div>

      <!-- Deposit Date -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Deposit Date *</span>
        </label>
        <input
          v-model="formData.depositDate"
          type="date"
          class="input input-bordered w-full"
          required
        />
      </div>

      <!-- Deposited By -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Deposited By *</span>
        </label>
        <input
          v-model="formData.depositedBy"
          type="text"
          class="input input-bordered w-full"
          placeholder="Name of person making deposit"
          required
        />
      </div>

      <!-- Cash Receipts Selection -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Select Cash Receipts to Include *</span>
          <span class="label-text-alt">{{ selectedReceipts.length }} selected</span>
        </label>

        <!-- Search/Filter -->
        <div class="mb-3">
          <input
            v-model="searchQuery"
            type="text"
            class="input input-bordered w-full"
            placeholder="Search by OR number, payor name..."
          />
        </div>

        <!-- Receipts Table -->
        <div class="overflow-x-auto border rounded-lg max-h-96">
          <table class="table table-sm">
            <thead class="bg-base-200 sticky top-0">
              <tr>
                <th>
                  <input
                    type="checkbox"
                    class="checkbox"
                    @change="toggleSelectAll"
                    :checked="allFilteredSelected"
                  />
                </th>
                <th>OR No.</th>
                <th>Date</th>
                <th>Payor</th>
                <th>Amount</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="receipt in filteredReceipts" :key="receipt.id" class="hover">
                <td>
                  <input
                    type="checkbox"
                    class="checkbox"
                    :value="receipt.id"
                    v-model="formData.receiptIds"
                  />
                </td>
                <td>{{ receipt.orNo }}</td>
                <td>{{ formatDate(receipt.receiptDate) }}</td>
                <td>{{ receipt.payorName }}</td>
                <td class="text-right">₱{{ formatCurrency(receipt.amount) }}</td>
                <td>
                  <span class="badge badge-sm" :class="getPaymentModeClass(receipt.paymentMode)">
                    {{ receipt.paymentMode }}
                  </span>
                </td>
              </tr>
              <tr v-if="filteredReceipts.length === 0">
                <td colspan="6" class="text-center text-gray-500">
                  No receipts available for deposit
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="text-sm text-gray-600 mt-2">
          Note: Only undeposited receipts are shown
        </div>
      </div>

      <!-- Deposit Summary -->
      <div class="bg-blue-50 p-4 rounded-lg">
        <h3 class="font-semibold mb-3">Deposit Summary</h3>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <p class="text-sm text-gray-600">Number of Receipts:</p>
            <p class="text-lg font-bold">{{ selectedReceipts.length }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Total Deposit Amount:</p>
            <p class="text-lg font-bold text-blue-600">₱{{ formatCurrency(totalDepositAmount) }}</p>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-blue-200">
          <p class="text-sm text-gray-600">Deposit Slip Number (Auto-generated):</p>
          <p class="font-mono text-sm">DS-{{ new Date().getFullYear() }}-XXXX</p>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex gap-2 justify-end">
        <button type="button" @click="resetForm" class="btn btn-ghost" :disabled="isSubmitting">
          Reset
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="isSubmitting || formData.receiptIds.length === 0"
        >
          <span v-if="isSubmitting" class="loading loading-spinner"></span>
          {{ isSubmitting ? 'Creating...' : 'Create Bank Deposit' }}
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
  bankBranch: string;
}

interface CashReceipt {
  id: number;
  orNo: string;
  receiptDate: string;
  payorName: string;
  amount: string;
  paymentMode: 'cash' | 'check' | 'online';
}

const props = defineProps<{
  bankAccounts: string;
  availableReceipts: string;
}>();

const parsedBankAccounts = JSON.parse(props.bankAccounts) as BankAccount[];
const parsedReceipts = JSON.parse(props.availableReceipts) as CashReceipt[];

const bankAccounts = ref<BankAccount[]>(parsedBankAccounts);
const availableReceipts = ref<CashReceipt[]>(parsedReceipts);
const searchQuery = ref('');

const formData = ref({
  bankAccountId: '',
  depositDate: new Date().toISOString().split('T')[0],
  depositedBy: '',
  receiptIds: [] as number[],
});

const isSubmitting = ref(false);

const filteredReceipts = computed(() => {
  if (!searchQuery.value) return availableReceipts.value;

  const query = searchQuery.value.toLowerCase();
  return availableReceipts.value.filter(receipt =>
    receipt.orNo.toLowerCase().includes(query) ||
    receipt.payorName.toLowerCase().includes(query)
  );
});

const selectedReceipts = computed(() => {
  return availableReceipts.value.filter(r => formData.value.receiptIds.includes(r.id));
});

const totalDepositAmount = computed(() => {
  return selectedReceipts.value.reduce((sum, r) => sum + Number(r.amount), 0);
});

const allFilteredSelected = computed(() => {
  if (filteredReceipts.value.length === 0) return false;
  return filteredReceipts.value.every(r => formData.value.receiptIds.includes(r.id));
});

const toggleSelectAll = () => {
  if (allFilteredSelected.value) {
    // Deselect all filtered
    const filteredIds = filteredReceipts.value.map(r => r.id);
    formData.value.receiptIds = formData.value.receiptIds.filter(id => !filteredIds.includes(id));
  } else {
    // Select all filtered
    const filteredIds = filteredReceipts.value.map(r => r.id);
    formData.value.receiptIds = [...new Set([...formData.value.receiptIds, ...filteredIds])];
  }
};

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getPaymentModeClass = (mode: string) => {
  switch (mode) {
    case 'cash': return 'badge-success';
    case 'check': return 'badge-warning';
    case 'online': return 'badge-info';
    default: return '';
  }
};

const submitForm = async () => {
  if (formData.value.receiptIds.length === 0) {
    alert('Please select at least one cash receipt');
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await fetch('/api/cash/deposits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bankAccountId: Number(formData.value.bankAccountId),
        depositDate: formData.value.depositDate,
        depositedBy: formData.value.depositedBy,
        receiptIds: formData.value.receiptIds,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create bank deposit');
    }

    alert(`Bank Deposit ${data.depositSlipNo} created successfully!`);

    // Redirect to deposits list
    window.location.href = '/cash/deposits';
  } catch (error) {
    console.error('Error creating bank deposit:', error);
    alert(`Error: ${error instanceof Error ? error.message : 'Failed to create bank deposit'}`);
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    bankAccountId: '',
    depositDate: new Date().toISOString().split('T')[0],
    depositedBy: '',
    receiptIds: [],
  };
  searchQuery.value = '';
};
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}
</style>
