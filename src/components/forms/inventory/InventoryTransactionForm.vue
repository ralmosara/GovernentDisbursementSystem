<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  itemId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits(['submit', 'cancel']);

const formData = ref({
  itemId: props.itemId || 0,
  transactionDate: new Date().toISOString().split('T')[0],
  transactionType: '',
  quantity: 0,
  unitCost: '',
  reference: '',
  requestedBy: '',
  remarks: '',
});

const items = ref<any[]>([]);
const loading = ref(false);
const errors = ref<Record<string, string>>({});

const transactionTypes = [
  { value: 'receipt', label: 'Receipt (Stock In)', icon: 'pi-plus-circle', color: 'text-green-600' },
  { value: 'issue', label: 'Issue (Stock Out)', icon: 'pi-minus-circle', color: 'text-red-600' },
  { value: 'adjustment', label: 'Adjustment', icon: 'pi-sync', color: 'text-orange-600' },
  { value: 'transfer', label: 'Transfer', icon: 'pi-arrows-h', color: 'text-blue-600' },
];

const selectedItem = computed(() => {
  return items.value.find((i) => i.id === formData.value.itemId);
});

const transactionValue = computed(() => {
  const cost = parseFloat(formData.value.unitCost || selectedItem.value?.unitCost || '0');
  const qty = formData.value.quantity || 0;
  return cost * qty;
});

onMounted(async () => {
  await fetchItems();
  if (selectedItem.value) {
    formData.value.unitCost = selectedItem.value.unitCost;
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
    formData.value.unitCost = selectedItem.value.unitCost;
  }
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.itemId) {
    errors.value.itemId = 'Item is required';
  }

  if (!formData.value.transactionDate) {
    errors.value.transactionDate = 'Transaction date is required';
  }

  if (!formData.value.transactionType) {
    errors.value.transactionType = 'Transaction type is required';
  }

  if (!formData.value.quantity || formData.value.quantity <= 0) {
    errors.value.quantity = 'Quantity must be greater than 0';
  }

  // Check if issue quantity exceeds stock
  if (formData.value.transactionType === 'issue' && selectedItem.value) {
    if (formData.value.quantity > selectedItem.value.quantityOnHand) {
      errors.value.quantity = `Insufficient stock. Available: ${selectedItem.value.quantityOnHand}`;
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
          {{ item.itemCode }} - {{ item.itemName }} (Stock: {{ item.quantityOnHand }})
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
          <span class="text-blue-700">On Hand:</span>
          <div class="font-medium text-blue-900">{{ selectedItem.quantityOnHand }} {{ selectedItem.unit }}</div>
        </div>
        <div>
          <span class="text-blue-700">Unit Cost:</span>
          <div class="font-medium text-blue-900">₱{{ Number(selectedItem.unitCost).toLocaleString() }}</div>
        </div>
        <div>
          <span class="text-blue-700">Stock Status:</span>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            :class="{
              'bg-green-100 text-green-800': selectedItem.stockStatus === 'adequate',
              'bg-orange-100 text-orange-800': selectedItem.stockStatus === 'low',
              'bg-red-100 text-red-800': selectedItem.stockStatus === 'out',
            }"
          >
            {{ selectedItem.stockStatus }}
          </span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Transaction Date -->
      <div>
        <label for="transactionDate" class="block text-sm font-medium text-gray-700">
          Transaction Date <span class="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="transactionDate"
          v-model="formData.transactionDate"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.transactionDate }"
        />
        <p v-if="errors.transactionDate" class="mt-1 text-sm text-red-600">{{ errors.transactionDate }}</p>
      </div>

      <!-- Transaction Type -->
      <div>
        <label for="transactionType" class="block text-sm font-medium text-gray-700">
          Transaction Type <span class="text-red-500">*</span>
        </label>
        <select
          id="transactionType"
          v-model="formData.transactionType"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.transactionType }"
        >
          <option value="">Select type</option>
          <option v-for="type in transactionTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
        <p v-if="errors.transactionType" class="mt-1 text-sm text-red-600">{{ errors.transactionType }}</p>
      </div>

      <!-- Quantity -->
      <div>
        <label for="quantity" class="block text-sm font-medium text-gray-700">
          Quantity <span class="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="quantity"
          v-model.number="formData.quantity"
          min="1"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.quantity }"
        />
        <p v-if="errors.quantity" class="mt-1 text-sm text-red-600">{{ errors.quantity }}</p>
      </div>

      <!-- Unit Cost -->
      <div>
        <label for="unitCost" class="block text-sm font-medium text-gray-700">
          Unit Cost (₱)
        </label>
        <input
          type="number"
          id="unitCost"
          v-model="formData.unitCost"
          step="0.01"
          min="0"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="Auto-filled from item"
        />
        <p class="mt-1 text-xs text-gray-500">Leave blank to use item's unit cost</p>
      </div>

      <!-- Reference -->
      <div>
        <label for="reference" class="block text-sm font-medium text-gray-700">
          Reference No.
        </label>
        <input
          type="text"
          id="reference"
          v-model="formData.reference"
          maxlength="100"
          placeholder="PO#, DR#, etc."
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </div>

      <!-- Requested By -->
      <div>
        <label for="requestedBy" class="block text-sm font-medium text-gray-700">
          Requested/Received By
        </label>
        <input
          type="text"
          id="requestedBy"
          v-model="formData.requestedBy"
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
        placeholder="Additional notes..."
      ></textarea>
    </div>

    <!-- Transaction Summary -->
    <div v-if="formData.quantity && formData.transactionType" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 class="text-sm font-medium text-gray-900 mb-2">Transaction Summary</h3>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-gray-500">Total Value:</span>
          <div class="text-lg font-bold text-gray-900">₱{{ transactionValue.toLocaleString() }}</div>
        </div>
        <div v-if="selectedItem && formData.transactionType !== 'adjustment'">
          <span class="text-gray-500">New Stock Level:</span>
          <div class="text-lg font-bold" :class="{
            'text-green-600': formData.transactionType === 'receipt',
            'text-red-600': formData.transactionType === 'issue'
          }">
            {{ formData.transactionType === 'receipt'
              ? selectedItem.quantityOnHand + formData.quantity
              : selectedItem.quantityOnHand - formData.quantity
            }} {{ selectedItem.unit }}
          </div>
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
        <span v-else>Record Transaction</span>
      </button>
    </div>
  </form>
</template>
