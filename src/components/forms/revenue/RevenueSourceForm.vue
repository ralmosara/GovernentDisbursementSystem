<template>
  <div class="revenue-source-form">
    <form @submit.prevent="submitForm" class="space-y-6">
      <!-- Code (unique) -->
      <div class="form-group">
        <label for="code" class="block text-sm font-medium text-gray-700">
          Code <span class="text-red-500">*</span>
        </label>
        <input
          id="code"
          v-model="formData.code"
          type="text"
          required
          maxlength="20"
          placeholder="e.g., TAX001, FEE002"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.code }"
        />
        <p v-if="errors.code" class="mt-1 text-sm text-red-600">{{ errors.code }}</p>
        <p class="mt-1 text-xs text-gray-500">Unique code for this revenue source</p>
      </div>

      <!-- Name -->
      <div class="form-group">
        <label for="name" class="block text-sm font-medium text-gray-700">
          Name <span class="text-red-500">*</span>
        </label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          required
          maxlength="200"
          placeholder="e.g., Business Tax, Permit Fees"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.name }"
        />
        <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
      </div>

      <!-- Category -->
      <div class="form-group">
        <label for="category" class="block text-sm font-medium text-gray-700">
          Category <span class="text-red-500">*</span>
        </label>
        <select
          id="category"
          v-model="formData.category"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :class="{ 'border-red-500': errors.category }"
        >
          <option value="">Select a category...</option>
          <option value="Tax">Tax</option>
          <option value="Fees">Fees</option>
          <option value="Permits">Permits</option>
          <option value="Fines & Penalties">Fines & Penalties</option>
          <option value="Service Income">Service Income</option>
          <option value="Rental Income">Rental Income</option>
          <option value="Other Income">Other Income</option>
        </select>
        <p v-if="errors.category" class="mt-1 text-sm text-red-600">{{ errors.category }}</p>
      </div>

      <!-- Description (optional) -->
      <div class="form-group">
        <label for="description" class="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          v-model="formData.description"
          rows="3"
          maxlength="500"
          placeholder="Optional description of this revenue source..."
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        ></textarea>
        <p class="mt-1 text-xs text-gray-500">{{ formData.description?.length || 0 }}/500 characters</p>
      </div>

      <!-- Is Active (checkbox) -->
      <div class="form-group">
        <div class="flex items-start">
          <div class="flex h-5 items-center">
            <input
              id="isActive"
              v-model="formData.isActive"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          <div class="ml-3 text-sm">
            <label for="isActive" class="font-medium text-gray-700">Active</label>
            <p class="text-gray-500">Enable this revenue source for new entries</p>
          </div>
        </div>
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
          <span v-if="!isSubmitting">{{ isEditMode ? 'Update' : 'Create' }} Revenue Source</span>
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
import { ref, onMounted } from 'vue';

interface Props {
  sourceId?: string;
}

const props = defineProps<Props>();

interface FormData {
  code: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
}

const formData = ref<FormData>({
  code: '',
  name: '',
  category: '',
  description: '',
  isActive: true,
});

const errors = ref<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);
const isEditMode = ref(false);

onMounted(async () => {
  if (props.sourceId) {
    isEditMode.value = true;
    await loadRevenueSource();
  }
});

async function loadRevenueSource() {
  try {
    const response = await fetch(`/api/revenue/sources/${props.sourceId}`);

    if (!response.ok) {
      throw new Error('Failed to load revenue source');
    }

    const data = await response.json();

    formData.value = {
      code: data.code,
      name: data.name,
      category: data.category,
      description: data.description || '',
      isActive: data.isActive,
    };
  } catch (error) {
    console.error('Error loading revenue source:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load revenue source';
  }
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.code.trim()) {
    errors.value.code = 'Code is required';
  } else if (!/^[A-Z0-9_-]+$/i.test(formData.value.code)) {
    errors.value.code = 'Code must contain only letters, numbers, underscores, and hyphens';
  }

  if (!formData.value.name.trim()) {
    errors.value.name = 'Name is required';
  }

  if (!formData.value.category) {
    errors.value.category = 'Category is required';
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
      ? `/api/revenue/sources/${props.sourceId}`
      : '/api/revenue/sources';

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
      throw new Error(data.error || 'Failed to save revenue source');
    }

    // Success - redirect to sources list
    window.location.href = '/revenue/sources';
  } catch (error) {
    console.error('Error submitting form:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save revenue source';
  } finally {
    isSubmitting.value = false;
  }
}

function cancelForm() {
  window.location.href = '/revenue/sources';
}
</script>

<style scoped>
.revenue-source-form {
  max-width: 600px;
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
