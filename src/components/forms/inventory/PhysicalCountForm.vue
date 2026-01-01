<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  itemId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits(['submit', 'cancel']);

const formData = ref({
  itemId: props.itemId || 0,
  countDate: new Date().toISOString().split('T')[0],
  systemQuantity: 0,
  physicalQuantity: 0,
  countedBy: '',
  verifiedBy: '',
  remarks: '',
});

const items = ref<any[]>([]);
const loading = ref(false);
const errors = ref<Record<string, string>>({});

const selectedItem = computed(() => {
  return items.value.find((i) => i.id === formData.value.itemId);
});

const variance = computed(() => {
  return formData.value.physicalQuantity - formData.value.systemQuantity;
});

const varianceValue = computed(() => {
  if (!selectedItem.value) return 0;
  const unitCost = parseFloat(selectedItem.value.unitCost || '0');
  return variance.value * unitCost;
});

const hasVariance = computed(() => variance.value !== 0);

onMounted(async () => {
  await fetchItems();
  if (selectedItem.value) {
    formData.value.systemQuantity = selectedItem.value.quantityOnHand;
  }
});

async function fetchItems() {
  try {
    const response = await fetch('/api/inventory/items?isActive=true');
    if (response.ok) {
      items.value = await response.json();
    }
  } catch (error) {
    console.error('Error fetching items:', error);
  }
}

function onItemChange() {
  if (selectedItem.value) {
    formData.value.systemQuantity = selectedItem.value.quantityOnHand;
  }
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.itemId) {
    errors.value.itemId = 'Item is required';
  }

  if (!formData.value.countDate) {
    errors.value.countDate = 'Count date is required';
  }

  if (formData.value.physicalQuantity < 0) {
    errors.value.physicalQuantity = 'Physical quantity cannot be negative';
  }

  if (!formData.value.countedBy) {
    errors.value.countedBy = 'Counted by is required';
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
    <!-- Item Selection -->
    <div v-if="!itemId">
      <label for="itemId" class="block text-sm font-medium text-gray-700">
        Item <span class="text-red-500">*</span>
      </label>
      <select
        id="itemId"
        v-model="formData.itemId"
        @change="onItemChange"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        :class="{ 'border-red-500': errors.itemId }"
      >
        <option :value="0">Select an item</option>
        <option v-for="item in items" :key="item.id" :value="item.id">
          {{ item.itemCode }} - {{ item.itemName }} (Current: {{ item.quantityOnHand }} {{ item.unit }})
        </option>
      </select>
      <p v-if="errors.itemId" class="mt-1 text-sm text-red-600">{{ errors.itemId }}</p>
    </div>

    <!-- Item Details Display -->
    <div v-if="selectedItem" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 class="text-sm font-medium text-blue-900 mb-2">Item Details</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span class="text-blue-700">Item Code:</span>
          <div class="font-medium text-blue-900">{{ selectedItem.itemCode }}</div>
        </div>
        <div>
          <span class="text-blue-700">Item Name:</span>
          <div class="font-medium text-blue-900">{{ selectedItem.itemName }}</div>
        </div>
        <div>
          <span class="text-blue-700">Unit:</span>
          <div class="font-medium text-blue-900">{{ selectedItem.unit }}</div>
        </div>
        <div>
          <span class="text-blue-700">Unit Cost:</span>
          <div class="font-medium text-blue-900">₱{{ Number(selectedItem.unitCost).toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Count Date -->
      <div>
        <label for="countDate" class="block text-sm font-medium text-gray-700">
          Count Date <span class="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="countDate"
          v-model="formData.countDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.countDate }"
        />
        <p v-if="errors.countDate" class="mt-1 text-sm text-red-600">{{ errors.countDate }}</p>
      </div>

      <!-- System Quantity (Read-only) -->
      <div>
        <label for="systemQuantity" class="block text-sm font-medium text-gray-700">
          System Quantity
        </label>
        <input
          type="number"
          id="systemQuantity"
          v-model.number="formData.systemQuantity"
          readonly
          class="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
        />
        <p class="mt-1 text-xs text-gray-500">Auto-filled from current stock</p>
      </div>

      <!-- Physical Quantity -->
      <div>
        <label for="physicalQuantity" class="block text-sm font-medium text-gray-700">
          Physical Quantity <span class="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="physicalQuantity"
          v-model.number="formData.physicalQuantity"
          min="0"
          step="1"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.physicalQuantity }"
        />
        <p v-if="errors.physicalQuantity" class="mt-1 text-sm text-red-600">{{ errors.physicalQuantity }}</p>
      </div>

      <!-- Variance (Calculated) -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          Variance
        </label>
        <div class="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50">
          <span :class="{
            'text-green-600 font-semibold': variance > 0,
            'text-red-600 font-semibold': variance < 0,
            'text-gray-500': variance === 0
          }">
            {{ variance > 0 ? '+' : '' }}{{ variance }} {{ selectedItem?.unit || '' }}
          </span>
        </div>
        <p class="mt-1 text-xs text-gray-500">Physical - System quantity</p>
      </div>

      <!-- Counted By -->
      <div>
        <label for="countedBy" class="block text-sm font-medium text-gray-700">
          Counted By <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="countedBy"
          v-model="formData.countedBy"
          maxlength="255"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.countedBy }"
        />
        <p v-if="errors.countedBy" class="mt-1 text-sm text-red-600">{{ errors.countedBy }}</p>
      </div>

      <!-- Verified By -->
      <div>
        <label for="verifiedBy" class="block text-sm font-medium text-gray-700">
          Verified By
        </label>
        <input
          type="text"
          id="verifiedBy"
          v-model="formData.verifiedBy"
          maxlength="255"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
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
        rows="2"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        placeholder="Any discrepancies or notes..."
      ></textarea>
    </div>

    <!-- Variance Summary -->
    <div v-if="hasVariance && selectedItem" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <i class="pi pi-exclamation-triangle text-yellow-600 text-xl"></i>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">Variance Detected</h3>
          <div class="mt-2 text-sm text-yellow-700">
            <p class="mb-2">
              The physical count differs from the system quantity by
              <strong>{{ variance > 0 ? '+' : '' }}{{ variance }} {{ selectedItem.unit }}</strong>.
            </p>
            <div class="grid grid-cols-2 gap-4 mt-3">
              <div>
                <span class="text-yellow-600">Variance Value:</span>
                <div class="text-lg font-bold" :class="varianceValue > 0 ? 'text-green-700' : 'text-red-700'">
                  {{ varianceValue > 0 ? '+' : '' }}₱{{ Math.abs(varianceValue).toLocaleString() }}
                </div>
              </div>
              <div>
                <span class="text-yellow-600">New Stock Level:</span>
                <div class="text-lg font-bold text-yellow-800">
                  {{ formData.physicalQuantity }} {{ selectedItem.unit }}
                </div>
              </div>
            </div>
            <p class="mt-3 text-xs">
              An adjustment transaction will be automatically created to reconcile the variance.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- No Variance Confirmation -->
    <div v-else-if="selectedItem && formData.physicalQuantity > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <i class="pi pi-check-circle text-green-600 text-xl"></i>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-green-800">No Variance</h3>
          <p class="mt-1 text-sm text-green-700">
            Physical quantity matches system records. No adjustment needed.
          </p>
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
      <button
        type="button"
        @click="handleCancel"
        class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        :disabled="loading"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
        :disabled="loading"
      >
        <span v-if="loading">Processing...</span>
        <span v-else>Record Physical Count</span>
      </button>
    </div>
  </form>
</template>
