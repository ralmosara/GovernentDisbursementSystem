<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  initialData?: any;
}

const props = defineProps<Props>();
const emit = defineEmits(['submit', 'cancel']);

const formData = ref({
  itemName: props.initialData?.itemName || '',
  description: props.initialData?.description || '',
  unit: props.initialData?.unit || '',
  unitCost: props.initialData?.unitCost || '',
  quantityOnHand: props.initialData?.quantityOnHand || 0,
  minimumLevel: props.initialData?.minimumLevel || 0,
  maximumLevel: props.initialData?.maximumLevel || 0,
  isActive: props.initialData?.isActive !== false,
});

const loading = ref(false);
const errors = ref<Record<string, string>>({});

const commonUnits = [
  'piece',
  'box',
  'set',
  'pack',
  'ream',
  'bottle',
  'can',
  'kg',
  'liter',
  'meter',
  'pair',
  'dozen',
];

const totalValue = computed(() => {
  const cost = parseFloat(formData.value.unitCost || '0');
  const qty = formData.value.quantityOnHand || 0;
  return cost * qty;
});

const stockStatus = computed(() => {
  const qty = formData.value.quantityOnHand || 0;
  const min = formData.value.minimumLevel || 0;
  const max = formData.value.maximumLevel || 0;

  if (qty === 0) {
    return { label: 'Out of Stock', color: 'red' };
  } else if (qty <= min) {
    return { label: 'Low Stock', color: 'orange' };
  } else if (max > 0 && qty >= max) {
    return { label: 'Excess Stock', color: 'purple' };
  } else {
    return { label: 'Adequate', color: 'green' };
  }
});

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.itemName || formData.value.itemName.trim() === '') {
    errors.value.itemName = 'Item name is required';
  }

  if (!formData.value.unit || formData.value.unit.trim() === '') {
    errors.value.unit = 'Unit is required';
  }

  if (!formData.value.unitCost) {
    errors.value.unitCost = 'Unit cost is required';
  } else {
    const cost = parseFloat(formData.value.unitCost);
    if (isNaN(cost) || cost < 0) {
      errors.value.unitCost = 'Invalid unit cost';
    }
  }

  const qty = formData.value.quantityOnHand || 0;
  if (qty < 0) {
    errors.value.quantityOnHand = 'Quantity cannot be negative';
  }

  const min = formData.value.minimumLevel || 0;
  if (min < 0) {
    errors.value.minimumLevel = 'Minimum level cannot be negative';
  }

  const max = formData.value.maximumLevel || 0;
  if (max < 0) {
    errors.value.maximumLevel = 'Maximum level cannot be negative';
  }

  if (max > 0 && min > max) {
    errors.value.minimumLevel = 'Minimum level cannot exceed maximum level';
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
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Item Name -->
      <div class="md:col-span-2">
        <label for="itemName" class="block text-sm font-medium text-gray-700">
          Item Name <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="itemName"
          v-model="formData.itemName"
          maxlength="255"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.itemName }"
          placeholder="e.g., Bond Paper A4"
        />
        <p v-if="errors.itemName" class="mt-1 text-sm text-red-600">{{ errors.itemName }}</p>
      </div>

      <!-- Description -->
      <div class="md:col-span-2">
        <label for="description" class="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          v-model="formData.description"
          rows="2"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="Additional details about the item..."
        ></textarea>
      </div>

      <!-- Unit -->
      <div>
        <label for="unit" class="block text-sm font-medium text-gray-700">
          Unit of Measure <span class="text-red-500">*</span>
        </label>
        <select
          id="unit"
          v-model="formData.unit"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.unit }"
        >
          <option value="">Select unit</option>
          <option v-for="unit in commonUnits" :key="unit" :value="unit">
            {{ unit }}
          </option>
        </select>
        <p v-if="errors.unit" class="mt-1 text-sm text-red-600">{{ errors.unit }}</p>
      </div>

      <!-- Unit Cost -->
      <div>
        <label for="unitCost" class="block text-sm font-medium text-gray-700">
          Unit Cost (₱) <span class="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="unitCost"
          v-model="formData.unitCost"
          step="0.01"
          min="0"
          placeholder="0.00"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.unitCost }"
        />
        <p v-if="errors.unitCost" class="mt-1 text-sm text-red-600">{{ errors.unitCost }}</p>
      </div>

      <!-- Quantity on Hand -->
      <div>
        <label for="quantityOnHand" class="block text-sm font-medium text-gray-700">
          Initial Quantity
        </label>
        <input
          type="number"
          id="quantityOnHand"
          v-model.number="formData.quantityOnHand"
          min="0"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.quantityOnHand }"
          :disabled="!!initialData"
        />
        <p v-if="errors.quantityOnHand" class="mt-1 text-sm text-red-600">{{ errors.quantityOnHand }}</p>
        <p v-if="initialData" class="mt-1 text-xs text-gray-500">
          Use transactions to adjust quantity
        </p>
      </div>

      <!-- Minimum Level -->
      <div>
        <label for="minimumLevel" class="block text-sm font-medium text-gray-700">
          Minimum Stock Level
        </label>
        <input
          type="number"
          id="minimumLevel"
          v-model.number="formData.minimumLevel"
          min="0"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.minimumLevel }"
          placeholder="Reorder point"
        />
        <p v-if="errors.minimumLevel" class="mt-1 text-sm text-red-600">{{ errors.minimumLevel }}</p>
      </div>

      <!-- Maximum Level -->
      <div>
        <label for="maximumLevel" class="block text-sm font-medium text-gray-700">
          Maximum Stock Level
        </label>
        <input
          type="number"
          id="maximumLevel"
          v-model.number="formData.maximumLevel"
          min="0"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.maximumLevel }"
          placeholder="Maximum capacity"
        />
        <p v-if="errors.maximumLevel" class="mt-1 text-sm text-red-600">{{ errors.maximumLevel }}</p>
      </div>

      <!-- Is Active -->
      <div class="md:col-span-2">
        <div class="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            v-model="formData.isActive"
            class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label for="isActive" class="ml-2 block text-sm text-gray-900">
            Item is active
          </label>
        </div>
        <p class="mt-1 text-xs text-gray-500">Inactive items will not appear in transaction forms</p>
      </div>
    </div>

    <!-- Stock Preview (only when creating) -->
    <div v-if="!initialData && (formData.quantityOnHand || formData.minimumLevel || formData.maximumLevel)" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 class="text-sm font-medium text-blue-900 mb-3">Stock Preview</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span class="text-blue-700">Total Value:</span>
          <div class="mt-1 font-semibold text-blue-900">₱{{ totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
        </div>
        <div>
          <span class="text-blue-700">Stock Status:</span>
          <div class="mt-1">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="{
                'bg-green-100 text-green-800': stockStatus.color === 'green',
                'bg-orange-100 text-orange-800': stockStatus.color === 'orange',
                'bg-red-100 text-red-800': stockStatus.color === 'red',
                'bg-purple-100 text-purple-800': stockStatus.color === 'purple',
              }"
            >
              {{ stockStatus.label }}
            </span>
          </div>
        </div>
        <div>
          <span class="text-blue-700">Reorder Point:</span>
          <div class="mt-1 font-medium text-blue-900">{{ formData.minimumLevel || 0 }} {{ formData.unit }}</div>
        </div>
        <div>
          <span class="text-blue-700">Max Capacity:</span>
          <div class="mt-1 font-medium text-blue-900">
            {{ formData.maximumLevel || 'N/A' }} {{ formData.maximumLevel ? formData.unit : '' }}
          </div>
        </div>
      </div>
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
        <span v-else>{{ initialData ? 'Update' : 'Create' }} Item</span>
      </button>
    </div>
  </form>
</template>
