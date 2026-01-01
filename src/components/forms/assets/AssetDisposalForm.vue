<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Asset {
  id: number;
  assetNo: string;
  description: string;
  acquisitionCost: string;
  salvageValue: string;
  category: { name: string } | null;
}

interface User {
  id: number;
  name: string;
}

interface Props {
  assetId?: number;
  initialData?: any;
}

const props = defineProps<Props>();
const emit = defineEmits(['submit', 'cancel']);

const formData = ref({
  assetId: props.assetId || 0,
  disposalDate: props.initialData?.disposalDate || new Date().toISOString().split('T')[0],
  disposalMethod: props.initialData?.disposalMethod || '',
  disposalValue: props.initialData?.disposalValue || '',
  buyerRecipient: props.initialData?.buyerRecipient || '',
  approvedBy: props.initialData?.approvedBy?.id || 0,
  remarks: props.initialData?.remarks || '',
});

const assets = ref<Asset[]>([]);
const users = ref<User[]>([]);
const loading = ref(false);
const errors = ref<Record<string, string>>({});

const selectedAsset = computed(() => {
  return assets.value.find((a) => a.id === formData.value.assetId);
});

const disposalMethods = [
  { value: 'sale', label: 'Sale' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'donation', label: 'Donation' },
  { value: 'destruction', label: 'Destruction' },
  { value: 'trade_in', label: 'Trade-in' },
  { value: 'scrap', label: 'Scrap' },
  { value: 'obsolescence', label: 'Obsolescence' },
];

onMounted(async () => {
  await Promise.all([fetchAssets(), fetchUsers()]);
});

async function fetchAssets() {
  try {
    const response = await fetch('/api/assets/fixed');
    if (response.ok) {
      const data = await response.json();
      // Filter only active assets
      assets.value = data.filter((asset: Asset) => asset.id === props.assetId || !props.assetId);
    }
  } catch (error) {
    console.error('Error fetching assets:', error);
  }
}

async function fetchUsers() {
  try {
    const response = await fetch('/api/users');
    if (response.ok) {
      users.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.assetId) {
    errors.value.assetId = 'Asset is required';
  }

  if (!formData.value.disposalDate) {
    errors.value.disposalDate = 'Disposal date is required';
  }

  if (!formData.value.disposalMethod) {
    errors.value.disposalMethod = 'Disposal method is required';
  }

  if (formData.value.disposalMethod === 'sale' && !formData.value.buyerRecipient) {
    errors.value.buyerRecipient = 'Buyer is required for sale transactions';
  }

  if (formData.value.disposalValue) {
    const value = parseFloat(formData.value.disposalValue);
    if (isNaN(value) || value < 0) {
      errors.value.disposalValue = 'Invalid disposal value';
    }
  }

  return Object.keys(errors.value).length === 0;
}

function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  emit('submit', formData.value);
}

function handleCancel() {
  emit('cancel');
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Asset Selection (if not pre-selected) -->
    <div v-if="!assetId">
      <label for="assetId" class="block text-sm font-medium text-gray-700">
        Asset <span class="text-red-500">*</span>
      </label>
      <select
        id="assetId"
        v-model="formData.assetId"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        :class="{ 'border-red-500': errors.assetId }"
      >
        <option :value="0">Select an asset</option>
        <option v-for="asset in assets" :key="asset.id" :value="asset.id">
          {{ asset.assetNo }} - {{ asset.description }}
          <template v-if="asset.category"> ({{ asset.category.name }})</template>
        </option>
      </select>
      <p v-if="errors.assetId" class="mt-1 text-sm text-red-600">{{ errors.assetId }}</p>
    </div>

    <!-- Asset Details Display -->
    <div v-if="selectedAsset" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 class="text-sm font-medium text-blue-900 mb-2">Asset Details</h3>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span class="text-blue-700">Asset No:</span>
          <span class="ml-2 font-medium text-blue-900">{{ selectedAsset.assetNo }}</span>
        </div>
        <div>
          <span class="text-blue-700">Description:</span>
          <span class="ml-2 font-medium text-blue-900">{{ selectedAsset.description }}</span>
        </div>
        <div>
          <span class="text-blue-700">Acquisition Cost:</span>
          <span class="ml-2 font-medium text-blue-900">₱{{ Number(selectedAsset.acquisitionCost).toLocaleString() }}</span>
        </div>
        <div>
          <span class="text-blue-700">Salvage Value:</span>
          <span class="ml-2 font-medium text-blue-900">₱{{ Number(selectedAsset.salvageValue).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Disposal Date -->
      <div>
        <label for="disposalDate" class="block text-sm font-medium text-gray-700">
          Disposal Date <span class="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="disposalDate"
          v-model="formData.disposalDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.disposalDate }"
        />
        <p v-if="errors.disposalDate" class="mt-1 text-sm text-red-600">{{ errors.disposalDate }}</p>
      </div>

      <!-- Disposal Method -->
      <div>
        <label for="disposalMethod" class="block text-sm font-medium text-gray-700">
          Disposal Method <span class="text-red-500">*</span>
        </label>
        <select
          id="disposalMethod"
          v-model="formData.disposalMethod"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.disposalMethod }"
        >
          <option value="">Select method</option>
          <option v-for="method in disposalMethods" :key="method.value" :value="method.value">
            {{ method.label }}
          </option>
        </select>
        <p v-if="errors.disposalMethod" class="mt-1 text-sm text-red-600">{{ errors.disposalMethod }}</p>
      </div>

      <!-- Disposal Value -->
      <div>
        <label for="disposalValue" class="block text-sm font-medium text-gray-700">
          Disposal Value (₱)
        </label>
        <input
          type="number"
          id="disposalValue"
          v-model="formData.disposalValue"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.disposalValue }"
        />
        <p v-if="errors.disposalValue" class="mt-1 text-sm text-red-600">{{ errors.disposalValue }}</p>
        <p class="mt-1 text-xs text-gray-500">Amount received from disposal (if applicable)</p>
      </div>

      <!-- Buyer/Recipient -->
      <div>
        <label for="buyerRecipient" class="block text-sm font-medium text-gray-700">
          Buyer/Recipient
          <span v-if="formData.disposalMethod === 'sale'" class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="buyerRecipient"
          v-model="formData.buyerRecipient"
          maxlength="255"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.buyerRecipient }"
          placeholder="Name of buyer or receiving entity"
        />
        <p v-if="errors.buyerRecipient" class="mt-1 text-sm text-red-600">{{ errors.buyerRecipient }}</p>
      </div>

      <!-- Approved By -->
      <div class="md:col-span-2">
        <label for="approvedBy" class="block text-sm font-medium text-gray-700">
          Approved By
        </label>
        <select
          id="approvedBy"
          v-model="formData.approvedBy"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option :value="0">Select approving officer</option>
          <option v-for="user in users" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Remarks -->
    <div>
      <label for="remarks" class="block text-sm font-medium text-gray-700">
        Remarks
      </label>
      <textarea
        id="remarks"
        v-model="formData.remarks"
        rows="3"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        placeholder="Additional notes about the disposal..."
      ></textarea>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
      <button
        type="button"
        @click="handleCancel"
        class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        :disabled="loading"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        :disabled="loading"
      >
        <span v-if="loading">Processing...</span>
        <span v-else>{{ initialData ? 'Update' : 'Record' }} Disposal</span>
      </button>
    </div>
  </form>
</template>
