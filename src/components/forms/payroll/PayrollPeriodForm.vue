<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const props = defineProps<Props>();

const formData = ref({
  periodType: 'Regular',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  periodName: '',
  periodStart: '',
  periodEnd: '',
  payDate: '',
  remarks: '',
});

const errors = ref<Record<string, string>>({});

const periodTypes = ['Regular', 'Special', '13th Month', 'Mid-Year Bonus'];

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const years = computed(() => {
  const currentYear = new Date().getFullYear();
  const yearList = [];
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    yearList.push(i);
  }
  return yearList;
});

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.periodType) {
    errors.value.periodType = 'Period type is required';
  }

  if (!formData.value.month) {
    errors.value.month = 'Month is required';
  }

  if (!formData.value.year) {
    errors.value.year = 'Year is required';
  }

  if (!formData.value.periodStart) {
    errors.value.periodStart = 'Period start date is required';
  }

  if (!formData.value.periodEnd) {
    errors.value.periodEnd = 'Period end date is required';
  }

  if (!formData.value.payDate) {
    errors.value.payDate = 'Pay date is required';
  }

  // Validate date logic
  if (formData.value.periodStart && formData.value.periodEnd) {
    const startDate = new Date(formData.value.periodStart);
    const endDate = new Date(formData.value.periodEnd);

    if (startDate >= endDate) {
      errors.value.periodEnd = 'Period end date must be after start date';
    }
  }

  if (formData.value.periodEnd && formData.value.payDate) {
    const endDate = new Date(formData.value.periodEnd);
    const payDate = new Date(formData.value.payDate);

    if (payDate < endDate) {
      errors.value.payDate = 'Pay date must be on or after period end date';
    }
  }

  return Object.keys(errors.value).length === 0;
}

function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  props.onSubmit(formData.value);
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <!-- Period Details Section -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Period Details</h3>

      <div class="grid md:grid-cols-2 gap-4">
        <!-- Period Type -->
        <div>
          <label for="periodType" class="block text-sm font-medium text-gray-700 mb-1">
            Period Type <span class="text-red-500">*</span>
          </label>
          <select
            id="periodType"
            v-model="formData.periodType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.periodType }"
          >
            <option v-for="type in periodTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
          <p v-if="errors.periodType" class="mt-1 text-sm text-red-600">
            {{ errors.periodType }}
          </p>
        </div>

        <!-- Period Name (Optional) -->
        <div>
          <label for="periodName" class="block text-sm font-medium text-gray-700 mb-1">
            Period Name (Optional)
          </label>
          <input
            type="text"
            id="periodName"
            v-model="formData.periodName"
            placeholder="e.g., January 2026 Payroll"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <!-- Month -->
        <div>
          <label for="month" class="block text-sm font-medium text-gray-700 mb-1">
            Month <span class="text-red-500">*</span>
          </label>
          <select
            id="month"
            v-model="formData.month"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.month }"
          >
            <option v-for="month in months" :key="month.value" :value="month.value">
              {{ month.label }}
            </option>
          </select>
          <p v-if="errors.month" class="mt-1 text-sm text-red-600">
            {{ errors.month }}
          </p>
        </div>

        <!-- Year -->
        <div>
          <label for="year" class="block text-sm font-medium text-gray-700 mb-1">
            Year <span class="text-red-500">*</span>
          </label>
          <select
            id="year"
            v-model="formData.year"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.year }"
          >
            <option v-for="year in years" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
          <p v-if="errors.year" class="mt-1 text-sm text-red-600">
            {{ errors.year }}
          </p>
        </div>
      </div>
    </div>

    <!-- Date Range Section -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>

      <div class="grid md:grid-cols-3 gap-4">
        <!-- Period Start -->
        <div>
          <label for="periodStart" class="block text-sm font-medium text-gray-700 mb-1">
            Period Start <span class="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="periodStart"
            v-model="formData.periodStart"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.periodStart }"
          />
          <p v-if="errors.periodStart" class="mt-1 text-sm text-red-600">
            {{ errors.periodStart }}
          </p>
        </div>

        <!-- Period End -->
        <div>
          <label for="periodEnd" class="block text-sm font-medium text-gray-700 mb-1">
            Period End <span class="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="periodEnd"
            v-model="formData.periodEnd"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.periodEnd }"
          />
          <p v-if="errors.periodEnd" class="mt-1 text-sm text-red-600">
            {{ errors.periodEnd }}
          </p>
        </div>

        <!-- Pay Date -->
        <div>
          <label for="payDate" class="block text-sm font-medium text-gray-700 mb-1">
            Pay Date <span class="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="payDate"
            v-model="formData.payDate"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.payDate }"
          />
          <p v-if="errors.payDate" class="mt-1 text-sm text-red-600">
            {{ errors.payDate }}
          </p>
        </div>
      </div>
    </div>

    <!-- Remarks Section -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>

      <div>
        <label for="remarks" class="block text-sm font-medium text-gray-700 mb-1">
          Remarks
        </label>
        <textarea
          id="remarks"
          v-model="formData.remarks"
          rows="4"
          placeholder="Any additional notes or comments..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        ></textarea>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end gap-3">
      <button
        type="button"
        @click="onCancel"
        class="btn btn-secondary"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="btn btn-primary"
      >
        Create Period
      </button>
    </div>
  </form>
</template>
