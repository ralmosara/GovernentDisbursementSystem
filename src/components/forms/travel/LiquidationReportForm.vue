<template>
  <div class="lr-form">
    <form @submit.prevent="submitForm">

      <!-- Travel Information Display -->
      <div v-if="iotData" class="travel-info-card mb-6">
        <h3 class="section-title">Travel Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="info-item">
            <label class="info-label">IoT Number:</label>
            <span class="info-value">{{ iotData.iotNo }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Employee:</label>
            <span class="info-value">{{ iotData.employeeName }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Destination:</label>
            <span class="info-value">{{ iotData.destination }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Travel Period:</label>
            <span class="info-value">
              {{ formatDate(iotData.actualDepartureDate) }} - {{ formatDate(iotData.actualReturnDate) }}
            </span>
          </div>
          <div class="info-item">
            <label class="info-label">Estimated Cost:</label>
            <span class="info-value">{{ formatCurrency(iotData.estimatedCost) }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Cash Advance:</label>
            <span class="info-value font-semibold">{{ formatCurrency(iotData.cashAdvanceAmount) }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Fund Cluster -->
        <div class="form-group">
          <label for="fundCluster" class="form-label required">Fund Cluster</label>
          <select
            id="fundCluster"
            v-model="formData.fundClusterId"
            class="form-select"
            required
            :disabled="isSubmitting"
          >
            <option value="">Select Fund Cluster</option>
            <option v-for="fc in fundClusters" :key="fc.id" :value="fc.id">
              {{ fc.code }} - {{ fc.name }}
            </option>
          </select>
          <span v-if="errors.fundClusterId" class="error-message">{{ errors.fundClusterId }}</span>
        </div>

        <!-- Cash Advance DV Reference -->
        <div class="form-group">
          <label for="cashAdvanceDvId" class="form-label">Cash Advance DV No.</label>
          <input
            id="cashAdvanceDvId"
            v-model="formData.cashAdvanceDvNo"
            type="text"
            class="form-input"
            placeholder="DV number (if applicable)"
            :disabled="isSubmitting"
          />
        </div>

      </div>

      <!-- Expense Items Section -->
      <div class="expense-section mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="section-title">Expense Items</h3>
          <button
            type="button"
            @click="addExpenseItem"
            class="btn-primary btn-sm"
            :disabled="isSubmitting"
          >
            + Add Expense
          </button>
        </div>

        <div class="expense-list space-y-4">
          <div
            v-for="(item, index) in formData.expenseItems"
            :key="index"
            class="expense-item"
          >
            <div class="expense-header">
              <span class="expense-number">Expense #{{ index + 1 }}</span>
              <button
                v-if="formData.expenseItems.length > 1"
                type="button"
                @click="removeExpenseItem(index)"
                class="btn-danger btn-xs"
                :disabled="isSubmitting"
              >
                Remove
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
              <!-- Expense Date -->
              <div class="md:col-span-3">
                <label class="form-label-sm required">Date</label>
                <input
                  v-model="item.expenseDate"
                  type="date"
                  class="form-input"
                  required
                  :disabled="isSubmitting"
                />
              </div>

              <!-- Expense Category -->
              <div class="md:col-span-3">
                <label class="form-label-sm required">Category</label>
                <select
                  v-model="item.expenseCategory"
                  class="form-select"
                  required
                  :disabled="isSubmitting"
                >
                  <option value="">Select Category</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Lodging">Lodging</option>
                  <option value="Meals">Meals</option>
                  <option value="Registration">Registration/Fees</option>
                  <option value="Communication">Communication</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <!-- Description -->
              <div class="md:col-span-6">
                <label class="form-label-sm required">Description</label>
                <input
                  v-model="item.description"
                  type="text"
                  class="form-input"
                  placeholder="Describe the expense"
                  required
                  :disabled="isSubmitting"
                />
              </div>

              <!-- Amount -->
              <div class="md:col-span-3">
                <label class="form-label-sm required">Amount (₱)</label>
                <input
                  v-model.number="item.amount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="form-input"
                  placeholder="0.00"
                  required
                  :disabled="isSubmitting"
                />
              </div>

              <!-- OR/Invoice Number -->
              <div class="md:col-span-3">
                <label class="form-label-sm">OR/Invoice No.</label>
                <input
                  v-model="item.orInvoiceNo"
                  type="text"
                  class="form-input"
                  placeholder="OR/Invoice number"
                  :disabled="isSubmitting"
                />
              </div>

              <!-- OR/Invoice Date -->
              <div class="md:col-span-3">
                <label class="form-label-sm">OR/Invoice Date</label>
                <input
                  v-model="item.orInvoiceDate"
                  type="date"
                  class="form-input"
                  :disabled="isSubmitting"
                />
              </div>

              <!-- Remarks -->
              <div class="md:col-span-3">
                <label class="form-label-sm">Remarks</label>
                <input
                  v-model="item.remarks"
                  type="text"
                  class="form-input"
                  placeholder="Optional remarks"
                  :disabled="isSubmitting"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Section -->
      <div class="summary-section mt-6 p-6 bg-gray-50 rounded-lg">
        <h3 class="section-title mb-4">Liquidation Summary</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- Expense Breakdown by Category -->
          <div>
            <h4 class="font-semibold text-sm mb-3">Expense Breakdown</h4>
            <div class="space-y-2">
              <div v-for="(total, category) in expensesByCategory" :key="category" class="flex justify-between text-sm">
                <span class="text-gray-600">{{ category }}:</span>
                <span class="font-medium">{{ formatCurrency(total) }}</span>
              </div>
            </div>
          </div>

          <!-- Financial Summary -->
          <div>
            <h4 class="font-semibold text-sm mb-3">Financial Summary</h4>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Cash Advance:</span>
                <span class="font-semibold text-lg">{{ formatCurrency(cashAdvanceAmount) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Total Expenses:</span>
                <span class="font-semibold text-lg">{{ formatCurrency(totalExpenses) }}</span>
              </div>
              <div class="border-t-2 border-gray-300 pt-3">
                <div v-if="balance > 0" class="flex justify-between items-center">
                  <span class="text-green-700 font-semibold">Refund to Agency:</span>
                  <span class="font-bold text-xl text-green-700">{{ formatCurrency(balance) }}</span>
                </div>
                <div v-else-if="balance < 0" class="flex justify-between items-center">
                  <span class="text-blue-700 font-semibold">Additional Claim:</span>
                  <span class="font-bold text-xl text-blue-700">{{ formatCurrency(Math.abs(balance)) }}</span>
                </div>
                <div v-else class="flex justify-between items-center">
                  <span class="text-gray-700 font-semibold">Balance:</span>
                  <span class="font-bold text-xl text-gray-700">{{ formatCurrency(0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Warning Messages -->
        <div v-if="balance < 0" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p class="text-sm text-blue-800">
            <strong>Note:</strong> An additional claim DV will need to be created for the amount exceeding the cash advance.
          </p>
        </div>
        <div v-if="balance > 0" class="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p class="text-sm text-green-800">
            <strong>Note:</strong> A refund DV will need to be created to return the unused cash advance.
          </p>
        </div>
      </div>

      <!-- Supporting Documents Note -->
      <div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 class="font-semibold text-amber-900 mb-2">Required Supporting Documents</h4>
        <ul class="text-sm text-amber-800 space-y-1 list-disc list-inside">
          <li>Official Receipts (OR) or Invoices for all expenses</li>
          <li>Approved Itinerary of Travel (IoT)</li>
          <li>Certificate of Travel Completed (CTC)</li>
          <li>Travel Order or Authority to Travel</li>
          <li>Other relevant documents (conference certificates, seminar materials, etc.)</li>
        </ul>
        <p class="text-xs text-amber-700 mt-2">
          Note: Documents can be attached after creating the liquidation report.
        </p>
      </div>

      <!-- Certification -->
      <div class="mt-6 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-start gap-3">
          <input
            id="certifyAccurate"
            v-model="formData.certifyAccurate"
            type="checkbox"
            class="form-checkbox h-5 w-5 mt-1"
            :disabled="isSubmitting"
          />
          <label for="certifyAccurate" class="text-sm">
            I certify that the above liquidation report is true and correct, and that all expenses were incurred
            for official business purposes as stated in the approved travel order.
          </label>
        </div>
        <span v-if="errors.certifyAccurate" class="error-message">{{ errors.certifyAccurate }}</span>
      </div>

      <!-- Form Actions -->
      <div class="form-actions mt-6 flex gap-3">
        <button
          type="submit"
          class="btn-primary"
          :disabled="isSubmitting || !canSubmit"
        >
          <span v-if="isSubmitting">Saving...</span>
          <span v-else>{{ mode === 'create' ? 'Create Liquidation Report' : 'Update Liquidation Report' }}</span>
        </button>
        <button
          v-if="mode === 'create'"
          type="button"
          @click="submitAndReview"
          class="btn-success"
          :disabled="isSubmitting || !canSubmit"
        >
          <span v-if="isSubmitting">Saving...</span>
          <span v-else>Create & Submit for Review</span>
        </button>
        <button
          type="button"
          @click="cancel"
          class="btn-secondary"
          :disabled="isSubmitting"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  mode?: 'create' | 'edit';
  iotId: number;
  iotData?: any;
  initialData?: any;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
});

const emit = defineEmits(['submit', 'cancel']);

const isSubmitting = ref(false);
const fundClusters = ref<any[]>([]);
const errors = ref<Record<string, string>>({});

const formData = ref({
  fundClusterId: '',
  cashAdvanceDvNo: '',
  expenseItems: [
    {
      expenseDate: '',
      expenseCategory: '',
      description: '',
      amount: 0,
      orInvoiceNo: '',
      orInvoiceDate: '',
      remarks: ''
    }
  ],
  certifyAccurate: false,
});

const cashAdvanceAmount = computed(() => {
  return props.iotData?.cashAdvanceAmount || 0;
});

const totalExpenses = computed(() => {
  return formData.value.expenseItems.reduce((sum, item) => sum + (item.amount || 0), 0);
});

const balance = computed(() => {
  return cashAdvanceAmount.value - totalExpenses.value;
});

const expensesByCategory = computed(() => {
  const breakdown: Record<string, number> = {};
  formData.value.expenseItems.forEach(item => {
    if (item.expenseCategory && item.amount) {
      if (!breakdown[item.expenseCategory]) {
        breakdown[item.expenseCategory] = 0;
      }
      breakdown[item.expenseCategory] += item.amount;
    }
  });
  return breakdown;
});

const canSubmit = computed(() => {
  return formData.value.certifyAccurate &&
         formData.value.expenseItems.length > 0 &&
         formData.value.expenseItems.every(item =>
           item.expenseDate && item.expenseCategory && item.description && item.amount > 0
         );
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(value);
};

const formatDate = (date: string | Date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const addExpenseItem = () => {
  formData.value.expenseItems.push({
    expenseDate: '',
    expenseCategory: '',
    description: '',
    amount: 0,
    orInvoiceNo: '',
    orInvoiceDate: '',
    remarks: ''
  });
};

const removeExpenseItem = (index: number) => {
  if (formData.value.expenseItems.length > 1) {
    formData.value.expenseItems.splice(index, 1);
  }
};

const validateForm = () => {
  errors.value = {};
  let isValid = true;

  if (!formData.value.fundClusterId) {
    errors.value.fundClusterId = 'Fund cluster is required';
    isValid = false;
  }

  if (!formData.value.certifyAccurate) {
    errors.value.certifyAccurate = 'You must certify the accuracy of this report';
    isValid = false;
  }

  if (formData.value.expenseItems.length === 0) {
    errors.value.expenseItems = 'At least one expense item is required';
    isValid = false;
  }

  return isValid;
};

const submitForm = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    emit('submit', {
      iotId: props.iotId,
      ...formData.value,
      submitForReview: false
    });
  } catch (error) {
    console.error('Error submitting form:', error);
  } finally {
    isSubmitting.value = false;
  }
};

const submitAndReview = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    emit('submit', {
      iotId: props.iotId,
      ...formData.value,
      submitForReview: true
    });
  } catch (error) {
    console.error('Error submitting form:', error);
  } finally {
    isSubmitting.value = false;
  }
};

const cancel = () => {
  emit('cancel');
};

const loadFundClusters = async () => {
  try {
    const response = await fetch('/api/fund-clusters?active=true');
    const data = await response.json();
    fundClusters.value = data.fundClusters || [];
  } catch (error) {
    console.error('Error loading fund clusters:', error);
  }
};

onMounted(() => {
  loadFundClusters();

  if (props.iotData) {
    formData.value.fundClusterId = props.iotData.fundClusterId;
  }

  if (props.initialData) {
    formData.value = { ...formData.value, ...props.initialData };
  }
});
</script>

<style scoped>
.lr-form {
  @apply bg-white p-6 rounded-lg shadow;
}

.travel-info-card {
  @apply bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200;
}

.section-title {
  @apply text-lg font-semibold text-gray-800;
}

.info-item {
  @apply flex flex-col;
}

.info-label {
  @apply text-xs font-medium text-gray-600 mb-1;
}

.info-value {
  @apply text-sm text-gray-900;
}

.form-group {
  @apply mb-4;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.form-label.required::after {
  content: ' *';
  @apply text-red-500;
}

.form-label-sm {
  @apply block text-xs font-medium text-gray-700 mb-1;
}

.form-label-sm.required::after {
  content: ' *';
  @apply text-red-500;
}

.form-input,
.form-select,
.form-textarea {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.form-input:disabled,
.form-select:disabled,
.form-textarea:disabled {
  @apply bg-gray-100 cursor-not-allowed;
}

.form-checkbox {
  @apply rounded border-gray-300 text-blue-600 focus:ring-blue-500;
}

.error-message {
  @apply block text-sm text-red-600 mt-1;
}

.expense-section {
  @apply border-t-2 border-gray-200 pt-6;
}

.expense-item {
  @apply bg-gray-50 p-4 rounded-lg border border-gray-200;
}

.expense-header {
  @apply flex justify-between items-center mb-3;
}

.expense-number {
  @apply font-semibold text-sm text-gray-700;
}

.summary-section {
  @apply border-t-2 border-gray-300;
}

.btn-primary,
.btn-secondary,
.btn-success,
.btn-danger {
  @apply px-4 py-2 rounded-md font-medium transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.btn-primary:disabled {
  @apply bg-blue-300 cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
}

.btn-success {
  @apply bg-green-600 text-white hover:bg-green-700;
}

.btn-success:disabled {
  @apply bg-green-300 cursor-not-allowed;
}

.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.btn-sm {
  @apply px-3 py-1.5 text-sm;
}

.btn-xs {
  @apply px-2 py-1 text-xs;
}

.form-actions {
  @apply flex gap-3 pt-4 border-t border-gray-200;
}
</style>
