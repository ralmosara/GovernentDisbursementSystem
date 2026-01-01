<template>
  <div class="revenue-entry-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- Entry Number Preview -->
      <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div class="flex items-center">
          <i class="pi pi-info-circle text-blue-500 mr-2"></i>
          <div>
            <p class="text-sm font-medium text-blue-900">Entry Number (Auto-generated)</p>
            <p class="text-lg font-semibold text-blue-700">{{ entryNumberPreview }}</p>
          </div>
        </div>
      </div>

      <!-- Entry Date -->
      <div class="form-group">
        <label for="entryDate" class="block text-sm font-medium text-gray-700">
          Entry Date <span class="text-red-500">*</span>
        </label>
        <input
          id="entryDate"
          v-model="formData.entryDate"
          type="date"
          required
          :max="maxDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.entryDate }"
        />
        <p v-if="errors.entryDate" class="mt-1 text-sm text-red-600">{{ errors.entryDate }}</p>
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

      <!-- Fund Cluster -->
      <div class="form-group">
        <label for="fundClusterId" class="block text-sm font-medium text-gray-700">
          Fund Cluster <span class="text-red-500">*</span>
        </label>
        <select
          id="fundClusterId"
          v-model="formData.fundClusterId"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.fundClusterId }"
        >
          <option value="">Select fund cluster...</option>
          <option
            v-for="cluster in fundClusters"
            :key="cluster.id"
            :value="cluster.id"
          >
            {{ cluster.code }} - {{ cluster.name }}
          </option>
        </select>
        <p v-if="errors.fundClusterId" class="mt-1 text-sm text-red-600">{{ errors.fundClusterId }}</p>
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

      <!-- Payor Name -->
      <div class="form-group">
        <label for="payorName" class="block text-sm font-medium text-gray-700">
          Payor Name
        </label>
        <input
          id="payorName"
          v-model="formData.payorName"
          type="text"
          maxlength="200"
          placeholder="Optional - Name of person/entity paying"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
        <p class="mt-1 text-xs text-gray-500">Optional: Person or entity making the payment</p>
      </div>

      <!-- Particulars -->
      <div class="form-group">
        <label for="particulars" class="block text-sm font-medium text-gray-700">
          Particulars
        </label>
        <textarea
          id="particulars"
          v-model="formData.particulars"
          rows="3"
          maxlength="500"
          placeholder="Optional - Description of revenue entry..."
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500">{{ formData.particulars?.length || 0 }}/500 characters</p>
      </div>

      <!-- Fiscal Year (read-only, auto-calculated) -->
      <div class="form-group">
        <label for="fiscalYear" class="block text-sm font-medium text-gray-700">
          Fiscal Year
        </label>
        <input
          id="fiscalYear"
          :value="fiscalYear"
          type="text"
          readonly
          class="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm cursor-not-allowed"
        />
        <p class="mt-1 text-xs text-gray-500">Auto-calculated from entry date</p>
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
          <span v-if="!isSubmitting">Record Revenue Entry</span>
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
  revenueSourcesData?: string;
  fundClustersData?: string;
}

const props = defineProps<Props>();

interface FormData {
  entryDate: string;
  revenueSourceId: number | null;
  fundClusterId: number | null;
  amount: string;
  payorName: string;
  particulars: string;
}

const formData = ref<FormData>({
  entryDate: new Date().toISOString().split('T')[0],
  revenueSourceId: null,
  fundClusterId: null,
  amount: '',
  payorName: '',
  particulars: '',
});

const errors = ref<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const revenueSources = ref<any[]>([]);
const fundClusters = ref<any[]>([]);

const maxDate = computed(() => new Date().toISOString().split('T')[0]);

const fiscalYear = computed(() => {
  if (!formData.value.entryDate) return '';
  return new Date(formData.value.entryDate).getFullYear().toString();
});

const entryNumberPreview = computed(() => {
  const year = fiscalYear.value || new Date().getFullYear();
  return `REV-${year}-XXXX`;
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

onMounted(async () => {
  await loadRevenueSources();
  await loadFundClusters();
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

async function loadFundClusters() {
  try {
    if (props.fundClustersData) {
      fundClusters.value = JSON.parse(props.fundClustersData);
    } else {
      const response = await fetch('/api/fund-clusters');
      if (!response.ok) {
        throw new Error('Failed to load fund clusters');
      }
      fundClusters.value = await response.json();
    }
  } catch (error) {
    console.error('Error loading fund clusters:', error);
    errorMessage.value = 'Failed to load fund clusters';
  }
}

function formatAmount() {
  // Remove non-numeric characters except decimal point
  const value = formData.value.amount.replace(/[^\d.]/g, '');
  formData.value.amount = value;
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.entryDate) {
    errors.value.entryDate = 'Entry date is required';
  } else if (new Date(formData.value.entryDate) > new Date()) {
    errors.value.entryDate = 'Entry date cannot be in the future';
  }

  if (!formData.value.revenueSourceId) {
    errors.value.revenueSourceId = 'Revenue source is required';
  }

  if (!formData.value.fundClusterId) {
    errors.value.fundClusterId = 'Fund cluster is required';
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
    const response = await fetch('/api/revenue/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData.value,
        fiscalYear: parseInt(fiscalYear.value),
        revenueSourceId: Number(formData.value.revenueSourceId),
        fundClusterId: Number(formData.value.fundClusterId),
        amount: formData.value.amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to record revenue entry');
    }

    // Success - redirect to entries list
    window.location.href = '/revenue/entries';
  } catch (error) {
    console.error('Error submitting form:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to record revenue entry';
  } finally {
    isSubmitting.value = false;
  }
}

function cancelForm() {
  window.location.href = '/revenue/entries';
}
</script>

<style scoped>
.revenue-entry-form {
  max-width: 700px;
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
