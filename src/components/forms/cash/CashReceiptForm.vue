<template>
  <div class="cash-receipt-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- OR Series Selection -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">OR Series *</span>
        </label>
        <select v-model="formData.orSeriesId" class="select select-bordered w-full" required>
          <option value="">Select OR Series</option>
          <option v-for="series in orSeries" :key="series.id" :value="series.id">
            {{ series.seriesCode }} (Available: {{ series.endNumber - series.currentNumber }})
          </option>
        </select>
        <label class="label" v-if="selectedSeries">
          <span class="label-text-alt">Next OR: {{ previewORNumber }}</span>
        </label>
      </div>

      <!-- Receipt Date -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Receipt Date *</span>
        </label>
        <input
          v-model="formData.receiptDate"
          type="date"
          class="input input-bordered w-full"
          required
        />
      </div>

      <!-- Payor Information -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Payor Name *</span>
        </label>
        <input
          v-model="formData.payorName"
          type="text"
          class="input input-bordered w-full"
          placeholder="Enter payor name"
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
          class="input input-bordered w-full"
          placeholder="0.00"
          required
        />
        <label class="label" v-if="formData.amount > 0">
          <span class="label-text-alt">₱{{ formatCurrency(formData.amount) }}</span>
        </label>
      </div>

      <!-- Payment Mode -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Payment Mode *</span>
        </label>
        <select v-model="formData.paymentMode" class="select select-bordered w-full" required>
          <option value="">Select Payment Mode</option>
          <option value="cash">Cash</option>
          <option value="check">Check</option>
          <option value="online">Online Transfer</option>
        </select>
      </div>

      <!-- Check Details (shown only if payment mode is check) -->
      <div v-if="formData.paymentMode === 'check'" class="space-y-4 p-4 bg-base-200 rounded-lg">
        <h3 class="font-semibold">Check Details</h3>

        <div class="form-group">
          <label class="label">
            <span class="label-text">Check Number *</span>
          </label>
          <input
            v-model="formData.checkNo"
            type="text"
            class="input input-bordered w-full"
            placeholder="Check number"
            :required="formData.paymentMode === 'check'"
          />
        </div>

        <div class="form-group">
          <label class="label">
            <span class="label-text">Check Date *</span>
          </label>
          <input
            v-model="formData.checkDate"
            type="date"
            class="input input-bordered w-full"
            :required="formData.paymentMode === 'check'"
          />
        </div>

        <div class="form-group">
          <label class="label">
            <span class="label-text">Bank Name *</span>
          </label>
          <input
            v-model="formData.checkBank"
            type="text"
            class="input input-bordered w-full"
            placeholder="Bank name"
            :required="formData.paymentMode === 'check'"
          />
        </div>
      </div>

      <!-- Revenue Source -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Revenue Source</span>
        </label>
        <select v-model="formData.revenueSourceId" class="select select-bordered w-full">
          <option value="">Select Revenue Source (Optional)</option>
          <option v-for="source in revenueSources" :key="source.id" :value="source.id">
            {{ source.code }} - {{ source.name }}
          </option>
        </select>
      </div>

      <!-- Fund Cluster -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Fund Cluster *</span>
        </label>
        <select v-model="formData.fundClusterId" class="select select-bordered w-full" required>
          <option value="">Select Fund Cluster</option>
          <option v-for="fc in fundClusters" :key="fc.id" :value="fc.id">
            {{ fc.code }} - {{ fc.name }}
          </option>
        </select>
      </div>

      <!-- Particulars -->
      <div class="form-group">
        <label class="label">
          <span class="label-text">Particulars *</span>
        </label>
        <textarea
          v-model="formData.particulars"
          class="textarea textarea-bordered w-full"
          rows="3"
          placeholder="Enter particulars/purpose of payment"
          required
        ></textarea>
      </div>

      <!-- Form Actions -->
      <div class="flex gap-2 justify-end">
        <button type="button" @click="resetForm" class="btn btn-ghost" :disabled="isSubmitting">
          Reset
        </button>
        <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="loading loading-spinner"></span>
          {{ isSubmitting ? 'Issuing...' : 'Issue Official Receipt' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface ORSeries {
  id: number;
  seriesCode: string;
  currentNumber: number;
  endNumber: number;
}

interface RevenueSource {
  id: number;
  code: string;
  name: string;
}

interface FundCluster {
  id: number;
  code: string;
  name: string;
}

const props = defineProps<{
  orSeries: string;
  revenueSources: string;
  fundClusters: string;
}>();

const parsedORSeries = JSON.parse(props.orSeries) as ORSeries[];
const parsedRevenueSources = JSON.parse(props.revenueSources) as RevenueSource[];
const parsedFundClusters = JSON.parse(props.fundClusters) as FundCluster[];

const orSeries = ref<ORSeries[]>(parsedORSeries);
const revenueSources = ref<RevenueSource[]>(parsedRevenueSources);
const fundClusters = ref<FundCluster[]>(parsedFundClusters);

const formData = ref({
  orSeriesId: '',
  receiptDate: new Date().toISOString().split('T')[0],
  payorName: '',
  amount: 0,
  paymentMode: '',
  checkNo: '',
  checkDate: '',
  checkBank: '',
  revenueSourceId: '',
  fundClusterId: '',
  particulars: '',
});

const isSubmitting = ref(false);

const selectedSeries = computed(() => {
  return orSeries.value.find(s => s.id === Number(formData.value.orSeriesId));
});

const previewORNumber = computed(() => {
  if (!selectedSeries.value) return '';
  const nextNumber = selectedSeries.value.currentNumber + 1;
  return `${selectedSeries.value.seriesCode}-${String(nextNumber).padStart(6, '0')}`;
});

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const submitForm = async () => {
  isSubmitting.value = true;

  try {
    const response = await fetch('/api/cash/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orSeriesId: Number(formData.value.orSeriesId),
        receiptDate: formData.value.receiptDate,
        payorName: formData.value.payorName,
        amount: formData.value.amount,
        paymentMode: formData.value.paymentMode,
        checkNo: formData.value.checkNo || undefined,
        checkDate: formData.value.checkDate || undefined,
        checkBank: formData.value.checkBank || undefined,
        revenueSourceId: formData.value.revenueSourceId ? Number(formData.value.revenueSourceId) : undefined,
        fundClusterId: Number(formData.value.fundClusterId),
        particulars: formData.value.particulars,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create cash receipt');
    }

    alert(`Official Receipt ${data.orNo} issued successfully!`);

    // Redirect to receipt detail page
    window.location.href = `/cash/receipts/${data.id}`;
  } catch (error) {
    console.error('Error creating cash receipt:', error);
    alert(`Error: ${error instanceof Error ? error.message : 'Failed to issue official receipt'}`);
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
  formData.value = {
    orSeriesId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    payorName: '',
    amount: 0,
    paymentMode: '',
    checkNo: '',
    checkDate: '',
    checkBank: '',
    revenueSourceId: '',
    fundClusterId: '',
    particulars: '',
  };
};
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}
</style>
