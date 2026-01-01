<template>
  <div class="ar-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- AR Number Preview -->
      <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div class="flex items-center">
          <i class="pi pi-info-circle text-blue-500 mr-2"></i>
          <div>
            <p class="text-sm font-medium text-blue-900">AR Number (Auto-generated)</p>
            <p class="text-lg font-semibold text-blue-700">{{ arNumberPreview }}</p>
          </div>
        </div>
      </div>

      <!-- Revenue Source -->
      <div class="form-group">
        <label for="revenueSourceId" class="block text-sm font-medium text-gray-700">
          Revenue Source <span class="text-red-500">*</span>
        </label>
        <select
          id="revenueSourceId"
          v-model="formData.revenueSourceId"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.revenueSourceId }"
        >
          <option value="">Select revenue source...</option>
          <option
            v-for="source in revenueSources"
            :key="source.id"
            :value="source.id"
          >
            {{ source.code }} - {{ source.name }} ({{ source.category }})
          </option>
        </select>
        <p v-if="errors.revenueSourceId" class="mt-1 text-sm text-red-600">{{ errors.revenueSourceId }}</p>
      </div>

      <!-- Debtor Name -->
      <div class="form-group">
        <label for="debtorName" class="block text-sm font-medium text-gray-700">
          Debtor Name <span class="text-red-500">*</span>
        </label>
        <input
          id="debtorName"
          v-model="formData.debtorName"
          type="text"
          required
          maxlength="200"
          placeholder="Name of person or entity owing payment"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.debtorName }"
        />
        <p v-if="errors.debtorName" class="mt-1 text-sm text-red-600">{{ errors.debtorName }}</p>
      </div>

      <!-- Invoice Number (optional) -->
      <div class="form-group">
        <label for="invoiceNo" class="block text-sm font-medium text-gray-700">
          Invoice Number
        </label>
        <input
          id="invoiceNo"
          v-model="formData.invoiceNo"
          type="text"
          maxlength="50"
          placeholder="Optional - Reference invoice number"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
        <p class="mt-1 text-xs text-gray-500">Optional: Reference invoice or billing number</p>
      </div>

      <!-- Invoice Date -->
      <div class="form-group">
        <label for="invoiceDate" class="block text-sm font-medium text-gray-700">
          Invoice Date <span class="text-red-500">*</span>
        </label>
        <input
          id="invoiceDate"
          v-model="formData.invoiceDate"
          type="date"
          required
          :max="maxDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.invoiceDate }"
        />
        <p v-if="errors.invoiceDate" class="mt-1 text-sm text-red-600">{{ errors.invoiceDate }}</p>
      </div>

      <!-- Payment Terms -->
      <div class="form-group">
        <label for="paymentTerms" class="block text-sm font-medium text-gray-700">
          Payment Terms
        </label>
        <select
          id="paymentTerms"
          v-model="paymentTerms"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option :value="7">Due in 7 days</option>
          <option :value="15">Due in 15 days</option>
          <option :value="30">Net 30 days</option>
          <option :value="60">Net 60 days</option>
          <option :value="90">Net 90 days</option>
          <option :value="0">Custom</option>
        </select>
        <p class="mt-1 text-xs text-gray-500">Automatically calculates due date</p>
      </div>

      <!-- Due Date -->
      <div class="form-group">
        <label for="dueDate" class="block text-sm font-medium text-gray-700">
          Due Date <span class="text-red-500">*</span>
        </label>
        <input
          id="dueDate"
          v-model="formData.dueDate"
          type="date"
          required
          :min="minDueDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.dueDate }"
          :readonly="paymentTerms !== 0"
        />
        <p v-if="errors.dueDate" class="mt-1 text-sm text-red-600">{{ errors.dueDate }}</p>
        <p v-if="daysUntilDue > 0" class="mt-1 text-sm text-gray-600">
          {{ daysUntilDue }} day(s) from invoice date
        </p>
      </div>

      <!-- Amount -->
      <div class="form-group">
        <label for="amount" class="block text-sm font-medium text-gray-700">
          Amount <span class="text-red-500">*</span>
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
            required
            placeholder="0.00"
            class="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            :class="{ 'border-red-500': errors.amount }"
            @input="formatAmount"
          />
        </div>
        <p v-if="errors.amount" class="mt-1 text-sm text-red-600">{{ errors.amount }}</p>
        <p v-if="formattedAmount" class="mt-1 text-sm text-gray-600">
          {{ formattedAmount }}
        </p>
      </div>

      <!-- Summary Card -->
      <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-2">AR Summary</h4>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-gray-500">Invoice Date:</dt>
            <dd class="font-medium text-gray-900">{{ formatDate(formData.invoiceDate) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Due Date:</dt>
            <dd class="font-medium text-gray-900">{{ formatDate(formData.dueDate) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Amount Due:</dt>
            <dd class="font-medium text-gray-900">{{ formattedAmount || '₱0.00' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Initial Balance:</dt>
            <dd class="font-medium text-gray-900">{{ formattedAmount || '₱0.00' }}</dd>
          </div>
        </dl>
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
          <span v-if="!isSubmitting">Create Accounts Receivable</span>
          <span v-else>
            <i class="pi pi-spin pi-spinner mr-2"></i>
            Creating...
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
import { ref, computed, watch, onMounted } from 'vue';

interface Props {
  revenueSourcesData?: string;
}

const props = defineProps<Props>();

interface FormData {
  revenueSourceId: number | null;
  debtorName: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
}

const formData = ref<FormData>({
  revenueSourceId: null,
  debtorName: '',
  invoiceNo: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  amount: '',
});

const errors = ref<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const revenueSources = ref<any[]>([]);
const paymentTerms = ref(30); // Default to Net 30

const maxDate = computed(() => new Date().toISOString().split('T')[0]);

const minDueDate = computed(() => formData.value.invoiceDate || maxDate.value);

const arNumberPreview = computed(() => {
  const year = formData.value.invoiceDate
    ? new Date(formData.value.invoiceDate).getFullYear()
    : new Date().getFullYear();
  return `AR-${year}-XXXX`;
});

const formattedAmount = computed(() => {
  if (!formData.value.amount) return '';
  const amount = parseFloat(formData.value.amount);
  if (isNaN(amount)) return '';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
});

const daysUntilDue = computed(() => {
  if (!formData.value.invoiceDate || !formData.value.dueDate) return 0;
  const invoice = new Date(formData.value.invoiceDate);
  const due = new Date(formData.value.dueDate);
  const diff = due.getTime() - invoice.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Auto-calculate due date based on invoice date + payment terms
watch([() => formData.value.invoiceDate, paymentTerms], () => {
  if (paymentTerms.value === 0) return; // Custom mode

  if (formData.value.invoiceDate) {
    const invoiceDate = new Date(formData.value.invoiceDate);
    invoiceDate.setDate(invoiceDate.getDate() + paymentTerms.value);
    formData.value.dueDate = invoiceDate.toISOString().split('T')[0];
  }
});

onMounted(async () => {
  await loadRevenueSources();

  // Set initial due date (Net 30)
  if (formData.value.invoiceDate) {
    const invoiceDate = new Date(formData.value.invoiceDate);
    invoiceDate.setDate(invoiceDate.getDate() + 30);
    formData.value.dueDate = invoiceDate.toISOString().split('T')[0];
  }
});

async function loadRevenueSources() {
  try {
    if (props.revenueSourcesData) {
      revenueSources.value = JSON.parse(props.revenueSourcesData);
    } else {
      const response = await fetch('/api/revenue/sources?isActive=true');
      if (!response.ok) {
        throw new Error('Failed to load revenue sources');
      }
      revenueSources.value = await response.json();
    }
  } catch (error) {
    console.error('Error loading revenue sources:', error);
    errorMessage.value = 'Failed to load revenue sources';
  }
}

function formatAmount() {
  // Remove non-numeric characters except decimal point
  const value = formData.value.amount.replace(/[^\d.]/g, '');
  formData.value.amount = value;
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.revenueSourceId) {
    errors.value.revenueSourceId = 'Revenue source is required';
  }

  if (!formData.value.debtorName.trim()) {
    errors.value.debtorName = 'Debtor name is required';
  }

  if (!formData.value.invoiceDate) {
    errors.value.invoiceDate = 'Invoice date is required';
  } else if (new Date(formData.value.invoiceDate) > new Date()) {
    errors.value.invoiceDate = 'Invoice date cannot be in the future';
  }

  if (!formData.value.dueDate) {
    errors.value.dueDate = 'Due date is required';
  } else if (new Date(formData.value.dueDate) < new Date(formData.value.invoiceDate)) {
    errors.value.dueDate = 'Due date must be on or after invoice date';
  }

  if (!formData.value.amount) {
    errors.value.amount = 'Amount is required';
  } else if (parseFloat(formData.value.amount) <= 0) {
    errors.value.amount = 'Amount must be greater than 0';
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
    const response = await fetch('/api/revenue/receivables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData.value,
        revenueSourceId: Number(formData.value.revenueSourceId),
        amount: formData.value.amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create accounts receivable');
    }

    // Success - redirect to AR list
    window.location.href = '/revenue/receivables';
  } catch (error) {
    console.error('Error submitting form:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create accounts receivable';
  } finally {
    isSubmitting.value = false;
  }
}

function cancelForm() {
  window.location.href = '/revenue/receivables';
}
</script>

<style scoped>
.ar-form {
  max-width: 700px;
}

.form-group {
  margin-bottom: 1rem;
}

input:disabled,
input:read-only,
select:disabled,
textarea:disabled,
button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

input:read-only {
  background-color: #f9fafb;
}
</style>
