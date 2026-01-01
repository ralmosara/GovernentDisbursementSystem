<template>
  <div class="collection-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- Collection Number Preview -->
      <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div class="flex items-center">
          <i class="pi pi-info-circle text-blue-500 mr-2"></i>
          <div>
            <p class="text-sm font-medium text-blue-900">Collection Number (Auto-generated)</p>
            <p class="text-lg font-semibold text-blue-700">{{ collectionNumberPreview }}</p>
          </div>
        </div>
      </div>

      <!-- AR Selection -->
      <div class="form-group">
        <label for="arId" class="block text-sm font-medium text-gray-700">
          Accounts Receivable <span class="text-red-500">*</span>
        </label>
        <select
          id="arId"
          v-model="formData.arId"
          required
          @change="onARSelected"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.arId }"
        >
          <option value="">Select AR to collect payment...</option>
          <option
            v-for="ar in availableARs"
            :key="ar.id"
            :value="ar.id"
          >
            {{ ar.debtorName }} - {{ ar.arNo }} - Balance: ₱{{ formatNumber(ar.balance) }}
            <span v-if="isAROverdue(ar)" class="text-red-600">(OVERDUE)</span>
          </option>
        </select>
        <p v-if="errors.arId" class="mt-1 text-sm text-red-600">{{ errors.arId }}</p>
      </div>

      <!-- Selected AR Details Card -->
      <div v-if="selectedAR" class="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <i class="pi pi-file-edit mr-2"></i>
          AR Details
        </h4>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-gray-500">AR Number:</dt>
            <dd class="font-medium text-gray-900">{{ selectedAR.arNo }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Debtor:</dt>
            <dd class="font-medium text-gray-900">{{ selectedAR.debtorName }}</dd>
          </div>
          <div v-if="selectedAR.invoiceNo">
            <dt class="text-gray-500">Invoice No:</dt>
            <dd class="font-medium text-gray-900">{{ selectedAR.invoiceNo }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Invoice Date:</dt>
            <dd class="font-medium text-gray-900">{{ formatDate(selectedAR.invoiceDate) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Due Date:</dt>
            <dd class="font-medium text-gray-900" :class="{ 'text-red-600 font-bold': isAROverdue(selectedAR) }">
              {{ formatDate(selectedAR.dueDate) }}
              <span v-if="isAROverdue(selectedAR)" class="ml-1">({{ daysOverdue }} days overdue)</span>
            </dd>
          </div>
          <div>
            <dt class="text-gray-500">Status:</dt>
            <dd>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getStatusClass(selectedAR.status)"
              >
                {{ selectedAR.status.toUpperCase() }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-gray-500">Original Amount:</dt>
            <dd class="font-medium text-gray-900">₱{{ formatNumber(selectedAR.amount) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Amount Collected:</dt>
            <dd class="font-medium text-gray-900">₱{{ formatNumber(selectedAR.amountCollected) }}</dd>
          </div>
          <div class="col-span-2">
            <dt class="text-gray-500">Current Balance:</dt>
            <dd class="text-xl font-bold text-primary-600">₱{{ formatNumber(selectedAR.balance) }}</dd>
          </div>
        </dl>
      </div>

      <!-- Overdue Warning -->
      <div v-if="selectedAR && isAROverdue(selectedAR)" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <i class="pi pi-exclamation-triangle text-red-600 mr-2"></i>
          <div>
            <h4 class="text-sm font-medium text-red-800">Payment Overdue</h4>
            <p class="text-sm text-red-700 mt-1">
              This account is {{ daysOverdue }} day(s) past due. Please follow up with the debtor.
            </p>
          </div>
        </div>
      </div>

      <!-- Collection Date -->
      <div class="form-group">
        <label for="collectionDate" class="block text-sm font-medium text-gray-700">
          Collection Date <span class="text-red-500">*</span>
        </label>
        <input
          id="collectionDate"
          v-model="formData.collectionDate"
          type="date"
          required
          :max="maxDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.collectionDate }"
        />
        <p v-if="errors.collectionDate" class="mt-1 text-sm text-red-600">{{ errors.collectionDate }}</p>
      </div>

      <!-- Amount -->
      <div class="form-group">
        <label for="amount" class="block text-sm font-medium text-gray-700">
          Collection Amount <span class="text-red-500">*</span>
        </label>
        <div class="mt-1 relative rounded-md shadow-sm">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span class="text-gray-500 sm:text-sm">₱</span>
          </div>
          <input
            id="amount"
            v-model="formData.amount"
            type="number"
            step="0.01"
            min="0.01"
            :max="selectedAR?.balance || undefined"
            required
            placeholder="0.00"
            class="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            :class="{ 'border-red-500': errors.amount }"
            @input="formatAmount"
          />
        </div>
        <p v-if="errors.amount" class="mt-1 text-sm text-red-600">{{ errors.amount }}</p>
        <p v-if="selectedAR && formData.amount" class="mt-1 text-sm text-gray-600">
          New Balance: ₱{{ formatNumber(newBalance) }}
          <span v-if="newBalance === 0" class="text-green-600 font-medium ml-2">
            (FULLY PAID)
          </span>
        </p>
      </div>

      <!-- Payment Mode -->
      <div class="form-group">
        <label for="paymentMode" class="block text-sm font-medium text-gray-700">
          Payment Mode <span class="text-red-500">*</span>
        </label>
        <select
          id="paymentMode"
          v-model="formData.paymentMode"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.paymentMode }"
        >
          <option value="">Select payment mode...</option>
          <option value="cash">Cash</option>
          <option value="check">Check</option>
          <option value="online">Online Transfer</option>
        </select>
        <p v-if="errors.paymentMode" class="mt-1 text-sm text-red-600">{{ errors.paymentMode }}</p>
      </div>

      <!-- Check Details (if payment mode = check) -->
      <div v-if="formData.paymentMode === 'check'" class="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 class="text-sm font-medium text-blue-900">Check Details</h4>

        <!-- Check Number -->
        <div class="form-group">
          <label for="checkNo" class="block text-sm font-medium text-gray-700">
            Check Number <span class="text-red-500">*</span>
          </label>
          <input
            id="checkNo"
            v-model="formData.checkNo"
            type="text"
            required
            maxlength="50"
            placeholder="Enter check number"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            :class="{ 'border-red-500': errors.checkNo }"
          />
          <p v-if="errors.checkNo" class="mt-1 text-sm text-red-600">{{ errors.checkNo }}</p>
        </div>

        <!-- Check Date -->
        <div class="form-group">
          <label for="checkDate" class="block text-sm font-medium text-gray-700">
            Check Date <span class="text-red-500">*</span>
          </label>
          <input
            id="checkDate"
            v-model="formData.checkDate"
            type="date"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            :class="{ 'border-red-500': errors.checkDate }"
          />
          <p v-if="errors.checkDate" class="mt-1 text-sm text-red-600">{{ errors.checkDate }}</p>
        </div>

        <!-- Check Bank -->
        <div class="form-group">
          <label for="checkBank" class="block text-sm font-medium text-gray-700">
            Bank Name <span class="text-red-500">*</span>
          </label>
          <input
            id="checkBank"
            v-model="formData.checkBank"
            type="text"
            required
            maxlength="100"
            placeholder="Enter bank name"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            :class="{ 'border-red-500': errors.checkBank }"
          />
          <p v-if="errors.checkBank" class="mt-1 text-sm text-red-600">{{ errors.checkBank }}</p>
        </div>
      </div>

      <!-- OR Number (optional link) -->
      <div class="form-group">
        <label for="orNo" class="block text-sm font-medium text-gray-700">
          Official Receipt (OR) Number
        </label>
        <input
          id="orNo"
          v-model="formData.orNo"
          type="text"
          maxlength="50"
          placeholder="Optional - Link to OR number"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
        <p class="mt-1 text-xs text-gray-500">Optional: Link this collection to an official receipt</p>
      </div>

      <!-- Remarks -->
      <div class="form-group">
        <label for="remarks" class="block text-sm font-medium text-gray-700">
          Remarks
        </label>
        <textarea
          id="remarks"
          v-model="formData.remarks"
          rows="3"
          maxlength="500"
          placeholder="Optional notes about this collection..."
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500">{{ formData.remarks?.length || 0 }}/500 characters</p>
      </div>

      <!-- Form Actions -->
      <div class="flex items-center justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          @click="cancelForm"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          :disabled="isSubmitting"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSubmitting"
        >
          <span v-if="!isSubmitting">Record Collection</span>
          <span v-else>
            <i class="pi pi-spin pi-spinner mr-2"></i>
            Recording...
          </span>
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="rounded-md bg-red-50 p-4 border border-red-200">
        <div class="flex">
          <div class="flex-shrink-0">
            <i class="pi pi-exclamation-triangle text-red-400"></i>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{{ errorMessage }}</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  availableARsData?: string;
}

const props = defineProps<Props>();

interface FormData {
  arId: number | null;
  orNo: string;
  collectionDate: string;
  amount: string;
  paymentMode: '' | 'cash' | 'check' | 'online';
  checkNo: string;
  checkDate: string;
  checkBank: string;
  remarks: string;
}

const formData = ref<FormData>({
  arId: null,
  orNo: '',
  collectionDate: new Date().toISOString().split('T')[0],
  amount: '',
  paymentMode: '',
  checkNo: '',
  checkDate: '',
  checkBank: '',
  remarks: '',
});

const errors = ref<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const availableARs = ref<any[]>([]);
const selectedAR = ref<any>(null);

const maxDate = computed(() => new Date().toISOString().split('T')[0]);

const collectionNumberPreview = computed(() => {
  const year = formData.value.collectionDate
    ? new Date(formData.value.collectionDate).getFullYear()
    : new Date().getFullYear();
  return `COL-${year}-XXXX`;
});

const newBalance = computed(() => {
  if (!selectedAR.value || !formData.value.amount) return 0;
  const balance = parseFloat(selectedAR.value.balance) - parseFloat(formData.value.amount);
  return Math.max(0, balance);
});

const daysOverdue = computed(() => {
  if (!selectedAR.value) return 0;
  const today = new Date();
  const dueDate = new Date(selectedAR.value.dueDate);
  const diff = today.getTime() - dueDate.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

onMounted(async () => {
  await loadAvailableARs();
});

async function loadAvailableARs() {
  try {
    if (props.availableARsData) {
      availableARs.value = JSON.parse(props.availableARsData);
    } else {
      const response = await fetch('/api/revenue/receivables?status=outstanding&status=partial');
      if (!response.ok) {
        throw new Error('Failed to load available ARs');
      }
      availableARs.value = await response.json();
    }

    // Filter only outstanding or partial ARs
    availableARs.value = availableARs.value.filter(
      ar => ar.status === 'outstanding' || ar.status === 'partial'
    );
  } catch (error) {
    console.error('Error loading available ARs:', error);
    errorMessage.value = 'Failed to load available accounts receivable';
  }
}

function onARSelected() {
  selectedAR.value = availableARs.value.find(ar => ar.id === formData.value.arId) || null;

  // Auto-fill amount with full balance
  if (selectedAR.value) {
    formData.value.amount = selectedAR.value.balance.toString();
  }
}

function isAROverdue(ar: any): boolean {
  return new Date(ar.dueDate) < new Date();
}

function formatAmount() {
  // Remove non-numeric characters except decimal point
  const value = formData.value.amount.replace(/[^\d.]/g, '');
  formData.value.amount = value;
}

function formatNumber(value: any): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    outstanding: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    written_off: 'bg-red-100 text-red-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.arId) {
    errors.value.arId = 'Please select an accounts receivable';
  }

  if (!formData.value.collectionDate) {
    errors.value.collectionDate = 'Collection date is required';
  } else if (new Date(formData.value.collectionDate) > new Date()) {
    errors.value.collectionDate = 'Collection date cannot be in the future';
  }

  if (!formData.value.amount) {
    errors.value.amount = 'Collection amount is required';
  } else {
    const amount = parseFloat(formData.value.amount);
    if (amount <= 0) {
      errors.value.amount = 'Amount must be greater than 0';
    } else if (selectedAR.value && amount > parseFloat(selectedAR.value.balance)) {
      errors.value.amount = `Amount cannot exceed AR balance of ₱${formatNumber(selectedAR.value.balance)}`;
    }
  }

  if (!formData.value.paymentMode) {
    errors.value.paymentMode = 'Payment mode is required';
  }

  // Validate check details if payment mode is check
  if (formData.value.paymentMode === 'check') {
    if (!formData.value.checkNo.trim()) {
      errors.value.checkNo = 'Check number is required';
    }
    if (!formData.value.checkDate) {
      errors.value.checkDate = 'Check date is required';
    }
    if (!formData.value.checkBank.trim()) {
      errors.value.checkBank = 'Bank name is required';
    }
  }

  return Object.keys(errors.value).length === 0;
}

async function submitForm() {
  errorMessage.value = '';

  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    const payload: any = {
      arId: Number(formData.value.arId),
      collectionDate: formData.value.collectionDate,
      amount: formData.value.amount,
      paymentMode: formData.value.paymentMode,
      orNo: formData.value.orNo || undefined,
      remarks: formData.value.remarks || undefined,
    };

    // Add check details if payment mode is check
    if (formData.value.paymentMode === 'check') {
      payload.checkNo = formData.value.checkNo;
      payload.checkDate = formData.value.checkDate;
      payload.checkBank = formData.value.checkBank;
    }

    const response = await fetch('/api/revenue/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to record collection');
    }

    // Success - redirect to collections list
    window.location.href = '/revenue/collections';
  } catch (error) {
    console.error('Error submitting form:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to record collection';
  } finally {
    isSubmitting.value = false;
  }
}

function cancelForm() {
  window.location.href = '/revenue/collections';
}
</script>

<style scoped>
.collection-form {
  max-width: 800px;
}

.form-group {
  margin-bottom: 1rem;
}

input:disabled,
select:disabled,
textarea:disabled,
button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
