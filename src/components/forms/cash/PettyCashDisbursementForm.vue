<template>
  <div class="petty-cash-disbursement-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- Petty Cash Fund Selection -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Petty Cash Fund *</span>
        </label>
        <select v-model="formData.fundId" class="select select-bordered w-full" required @change="onFundChange">
          <option value="">Select Petty Cash Fund</option>
          <option v-for="fund in pettyCashFunds" :key="fund.id" :value="fund.id">
            {{ fund.fundCode }} - {{ fund.fundName }} (Custodian: {{ fund.custodian }})
          </option>
        </select>
      </div>

      <!-- Fund Balance Information -->
      <div v-if="selectedFund" class="bg-base-200 p-4 rounded-lg">
        <h3 class="font-semibold mb-3">Fund Information</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Fund Amount:</p>
            <p class="text-lg font-bold">₱{{ formatCurrency(selectedFund.fundAmount) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Current Balance:</p>
            <p class="text-lg font-bold" :class="currentBalanceClass">
              ₱{{ formatCurrency(selectedFund.currentBalance) }}
            </p>
          </div>
          <div v-if="selectedFund.replenishmentThreshold">
            <p class="text-sm text-gray-600">Replenishment Threshold:</p>
            <p class="text-sm">₱{{ formatCurrency(selectedFund.replenishmentThreshold) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Custodian:</p>
            <p class="text-sm">{{ selectedFund.custodian }}</p>
          </div>
        </div>

        <!-- Warning if below threshold -->
        <div v-if="isBelowThreshold" class="alert alert-warning mt-3">
          <i class="pi pi-exclamation-triangle"></i>
          <span>Fund is below replenishment threshold!</span>
        </div>
      </div>

      <!-- Transaction Date -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Transaction Date *</span>
        </label>
        <input
          v-model="formData.transactionDate"
          type="date"
          class="input input-bordered w-full"
          required
        />
      </div>

      <!-- Amount -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Amount *</span>
        </label>
        <input
          v-model.number="formData.amount"
          type="number"
          step="0.01"
          min="0"
          :max="selectedFund ? Number(selectedFund.currentBalance) : undefined"
          class="input input-bordered w-full"
          placeholder="0.00"
          required
          @input="checkBalance"
        />
        <label class="label">
          <span class="label-text-alt" v-if="formData.amount > 0">
            ₱{{ formatCurrency(formData.amount) }}
          </span>
          <span class="label-text-alt text-error" v-if="insufficientBalance">
            Insufficient balance!
          </span>
        </label>

        <!-- Balance after disbursement -->
        <div v-if="formData.amount > 0 && selectedFund" class="text-sm mt-2">
          <p class="text-gray-600">Balance after disbursement:</p>
          <p class="font-semibold" :class="balanceAfterClass">
            ₱{{ formatCurrency(balanceAfterDisbursement) }}
          </p>
        </div>
      </div>

      <!-- Payee -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Payee *</span>
        </label>
        <input
          v-model="formData.payee"
          type="text"
          class="input input-bordered w-full"
          placeholder="Name of person receiving payment"
          required
        />
      </div>

      <!-- Purpose -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Purpose *</span>
        </label>
        <textarea
          v-model="formData.purpose"
          class="textarea textarea-bordered w-full"
          rows="3"
          placeholder="Enter purpose of disbursement"
          required
        ></textarea>
      </div>

      <!-- OR Number (Optional) -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Official Receipt Number (Optional)</span>
        </label>
        <input
          v-model="formData.orNo"
          type="text"
          class="input input-bordered w-full"
          placeholder="OR number if available"
        />
      </div>

      <!-- Replenishment Warning -->
      <div v-if="willNeedReplenishment" class="alert alert-info">
        <i class="pi pi-info-circle"></i>
        <div>
          <p class="font-semibold">Replenishment Required</p>
          <p class="text-sm">This disbursement will bring the fund below the replenishment threshold. Please arrange for fund replenishment.</p>
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
          :disabled="isSubmitting || insufficientBalance || !formData.fundId"
        >
          <span v-if="isSubmitting" class="loading loading-spinner"></span>
          {{ isSubmitting ? 'Disbursing...' : 'Disburse Petty Cash' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface PettyCashFund {
  id: number;
  fundCode: string;
  fundName: string;
  custodian: string;
  fundAmount: string;
  currentBalance: string;
  replenishmentThreshold: string | null;
}

const props = defineProps<{
  pettyCashFunds: string;
}>();

const parsedFunds = JSON.parse(props.pettyCashFunds) as PettyCashFund[];
const pettyCashFunds = ref<PettyCashFund[]>(parsedFunds);

const formData = ref({
  fundId: '',
  transactionDate: new Date().toISOString().split('T')[0],
  amount: 0,
  payee: '',
  purpose: '',
  orNo: '',
});

const isSubmitting = ref(false);
const insufficientBalance = ref(false);

const selectedFund = computed(() => {
  if (!formData.value.fundId) return null;
  return pettyCashFunds.value.find(f => f.id === Number(formData.value.fundId));
});

const balanceAfterDisbursement = computed(() => {
  if (!selectedFund.value) return 0;
  return Number(selectedFund.value.currentBalance) - formData.value.amount;
});

const isBelowThreshold = computed(() => {
  if (!selectedFund.value || !selectedFund.value.replenishmentThreshold) return false;
  return Number(selectedFund.value.currentBalance) < Number(selectedFund.value.replenishmentThreshold);
});

const willNeedReplenishment = computed(() => {
  if (!selectedFund.value || !selectedFund.value.replenishmentThreshold) return false;
  return balanceAfterDisbursement.value < Number(selectedFund.value.replenishmentThreshold);
});

const currentBalanceClass = computed(() => {
  if (!selectedFund.value) return '';
  if (isBelowThreshold.value) return 'text-warning';
  return 'text-success';
});

const balanceAfterClass = computed(() => {
  if (insufficientBalance.value) return 'text-error';
  if (willNeedReplenishment.value) return 'text-warning';
  return 'text-success';
});

const checkBalance = () => {
  if (!selectedFund.value) {
    insufficientBalance.value = false;
    return;
  }

  const currentBalance = Number(selectedFund.value.currentBalance);
  insufficientBalance.value = formData.value.amount > currentBalance;
};

const onFundChange = () => {
  // Reset amount when fund changes
  formData.value.amount = 0;
  insufficientBalance.value = false;
};

const formatCurrency = (amount: string | number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
};

const submitForm = async () => {
  if (insufficientBalance.value) {
    alert('Insufficient balance in the petty cash fund');
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await fetch('/api/cash/petty-cash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'disburse',
        fundId: Number(formData.value.fundId),
        transactionDate: formData.value.transactionDate,
        amount: formData.value.amount,
        payee: formData.value.payee,
        purpose: formData.value.purpose,
        orNo: formData.value.orNo || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to disburse petty cash');
    }

    let message = 'Petty cash disbursed successfully!';
    if (data.needsReplenishment) {
      message += '\n\nWARNING: Fund is now below replenishment threshold. Please arrange for replenishment.';
    }

    alert(message);

    // Redirect or reset form
    window.location.href = '/cash/petty-cash';
  } catch (error) {
    console.error('Error disbursing petty cash:', error);
    alert(`Error: ${error instanceof Error ? error.message : 'Failed to disburse petty cash'}`);
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    fundId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    amount: 0,
    payee: '',
    purpose: '',
    orNo: '',
  };
  insufficientBalance.value = false;
};
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}
</style>
