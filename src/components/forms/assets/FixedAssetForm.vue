<template>
  <div class="fixed-asset-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- Asset Number Preview -->
      <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p class="text-sm text-blue-800">
          <i class="pi pi-info-circle mr-2"></i>
          <strong>Asset Number:</strong> {{ assetNumberPreview }}
        </p>
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="description" class="block text-sm font-medium text-gray-700">
          Description <span class="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          v-model="formData.description"
          rows="3"
          required
          placeholder="Describe the fixed asset..."
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.description }"
        ></textarea>
        <p v-if="errors.description" class="mt-1 text-sm text-red-600">{{ errors.description }}</p>
      </div>

      <!-- Asset Category -->
      <div class="form-group">
        <label for="assetCategoryId" class="block text-sm font-medium text-gray-700">
          Asset Category <span class="text-red-500">*</span>
        </label>
        <select
          id="assetCategoryId"
          v-model.number="formData.assetCategoryId"
          required
          @change="onCategoryChange"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.assetCategoryId }"
        >
          <option value="">Select a category...</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }} ({{ category.code }})
          </option>
        </select>
        <p v-if="errors.assetCategoryId" class="mt-1 text-sm text-red-600">{{ errors.assetCategoryId }}</p>
        <p v-if="selectedCategory" class="mt-1 text-xs text-gray-500">
          Depreciation: {{ selectedCategory.depreciationMethod === 'straight_line' ? 'Straight Line' : 'Declining Balance' }}
          • Default Life: {{ selectedCategory.usefulLife }} years
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Acquisition Date -->
        <div class="form-group">
          <label for="acquisitionDate" class="block text-sm font-medium text-gray-700">
            Acquisition Date <span class="text-red-500">*</span>
          </label>
          <input
            id="acquisitionDate"
            v-model="formData.acquisitionDate"
            type="date"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <!-- Acquisition Cost -->
        <div class="form-group">
          <label for="acquisitionCost" class="block text-sm font-medium text-gray-700">
            Acquisition Cost (₱) <span class="text-red-500">*</span>
          </label>
          <input
            id="acquisitionCost"
            v-model="formData.acquisitionCost"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <!-- Salvage Value -->
        <div class="form-group">
          <label for="salvageValue" class="block text-sm font-medium text-gray-700">
            Salvage Value (₱)
          </label>
          <input
            id="salvageValue"
            v-model="formData.salvageValue"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
          <p class="mt-1 text-xs text-gray-500">Estimated value at end of useful life</p>
        </div>

        <!-- Useful Life -->
        <div class="form-group">
          <label for="usefulLife" class="block text-sm font-medium text-gray-700">
            Useful Life (years) <span class="text-red-500">*</span>
          </label>
          <input
            id="usefulLife"
            v-model.number="formData.usefulLife"
            type="number"
            min="1"
            max="100"
            required
            placeholder="5"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
      </div>

      <!-- Location -->
      <div class="form-group">
        <label for="location" class="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          id="location"
          v-model="formData.location"
          type="text"
          maxlength="255"
          placeholder="e.g., Main Office, 2nd Floor"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <!-- Custodian -->
      <div class="form-group">
        <label for="custodian" class="block text-sm font-medium text-gray-700">
          Custodian
        </label>
        <input
          id="custodian"
          v-model="formData.custodian"
          type="text"
          maxlength="255"
          placeholder="Person or department responsible"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <!-- Serial Number -->
      <div class="form-group">
        <label for="serialNo" class="block text-sm font-medium text-gray-700">
          Serial Number
        </label>
        <input
          id="serialNo"
          v-model="formData.serialNo"
          type="text"
          maxlength="100"
          placeholder="Manufacturer's serial number"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
      </div>

      <!-- Depreciation Preview -->
      <div v-if="depreciationPreview" class="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-2">Depreciation Preview</h4>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-gray-500">Monthly Depreciation</dt>
            <dd class="font-medium text-gray-900">₱{{ depreciationPreview.monthly.toLocaleString() }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Annual Depreciation</dt>
            <dd class="font-medium text-gray-900">₱{{ depreciationPreview.annual.toLocaleString() }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Total Depreciable</dt>
            <dd class="font-medium text-gray-900">₱{{ depreciationPreview.totalDepreciable.toLocaleString() }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Schedule Periods</dt>
            <dd class="font-medium text-gray-900">{{ depreciationPreview.periods }} months</dd>
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
          <span v-if="!isSubmitting">{{ isEditMode ? 'Update' : 'Create' }} Fixed Asset</span>
          <span v-else>
            <i class="pi pi-spin pi-spinner mr-2"></i>
            {{ isEditMode ? 'Updating...' : 'Creating...' }}
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
  assetId?: string;
  categoriesJson?: string;
}

const props = defineProps<Props>();

interface FormData {
  description: string;
  assetCategoryId: number | null;
  acquisitionDate: string;
  acquisitionCost: string;
  salvageValue: string;
  usefulLife: number | null;
  location: string;
  custodian: string;
  serialNo: string;
}

const formData = ref<FormData>({
  description: '',
  assetCategoryId: null,
  acquisitionDate: new Date().toISOString().split('T')[0],
  acquisitionCost: '',
  salvageValue: '0',
  usefulLife: null,
  location: '',
  custodian: '',
  serialNo: '',
});

const categories = ref<any[]>([]);
const errors = ref<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const isEditMode = ref(false);

const selectedCategory = computed(() => {
  if (!formData.value.assetCategoryId) return null;
  return categories.value.find(c => c.id === formData.value.assetCategoryId);
});

const assetNumberPreview = computed(() => {
  const year = new Date(formData.value.acquisitionDate).getFullYear();
  return `ASSET-${year}-NNNN (auto-generated)`;
});

const depreciationPreview = computed(() => {
  if (!formData.value.acquisitionCost || !formData.value.usefulLife || !selectedCategory.value?.depreciationMethod) {
    return null;
  }

  const cost = parseFloat(formData.value.acquisitionCost);
  const salvage = parseFloat(formData.value.salvageValue || '0');
  const life = formData.value.usefulLife;
  const depreciable = cost - salvage;

  let monthly = 0;
  if (selectedCategory.value.depreciationMethod === 'straight_line') {
    monthly = depreciable / life / 12;
  } else {
    // Declining balance - approximate first month
    monthly = (cost * (2 / life)) / 12;
  }

  return {
    monthly: Math.round(monthly * 100) / 100,
    annual: Math.round((monthly * 12) * 100) / 100,
    totalDepreciable: depreciable,
    periods: life * 12,
  };
});

onMounted(async () => {
  await loadCategories();

  if (props.assetId) {
    isEditMode.value = true;
    await loadFixedAsset();
  }
});

async function loadCategories() {
  try {
    if (props.categoriesJson) {
      categories.value = JSON.parse(props.categoriesJson);
    } else {
      const response = await fetch('/api/assets/categories?isActive=true');
      if (response.ok) {
        categories.value = await response.json();
      }
    }
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

async function loadFixedAsset() {
  try {
    const response = await fetch(`/api/assets/fixed/${props.assetId}`);

    if (!response.ok) {
      throw new Error('Failed to load fixed asset');
    }

    const data = await response.json();

    formData.value = {
      description: data.description,
      assetCategoryId: data.category?.id || null,
      acquisitionDate: data.acquisitionDate.split('T')[0],
      acquisitionCost: data.acquisitionCost,
      salvageValue: data.salvageValue || '0',
      usefulLife: data.usefulLife,
      location: data.location || '',
      custodian: data.custodian || '',
      serialNo: data.serialNo || '',
    };
  } catch (error) {
    console.error('Error loading fixed asset:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load fixed asset';
  }
}

function onCategoryChange() {
  if (selectedCategory.value && selectedCategory.value.usefulLife) {
    formData.value.usefulLife = selectedCategory.value.usefulLife;
  }
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.description.trim()) {
    errors.value.description = 'Description is required';
  }

  if (!formData.value.assetCategoryId) {
    errors.value.assetCategoryId = 'Asset category is required';
  }

  if (!formData.value.acquisitionCost || parseFloat(formData.value.acquisitionCost) <= 0) {
    errors.value.acquisitionCost = 'Acquisition cost must be greater than 0';
  }

  if (!formData.value.usefulLife || formData.value.usefulLife <= 0) {
    errors.value.usefulLife = 'Useful life must be greater than 0';
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
    const url = isEditMode.value
      ? `/api/assets/fixed/${props.assetId}`
      : '/api/assets/fixed';

    const method = isEditMode.value ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData.value),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save fixed asset');
    }

    // Success - redirect to assets list or detail page
    if (isEditMode.value) {
      window.location.href = `/assets/fixed/${props.assetId}`;
    } else {
      window.location.href = `/assets/fixed/${data.id}`;
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save fixed asset';
  } finally {
    isSubmitting.value = false;
  }
}

function cancelForm() {
  window.location.href = '/assets/fixed';
}
</script>

<style scoped>
.fixed-asset-form {
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
