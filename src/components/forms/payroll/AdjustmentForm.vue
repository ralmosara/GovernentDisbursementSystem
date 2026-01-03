<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  employees?: any[];
}

const props = defineProps<Props>();

const formData = ref({
  employeeId: null,
  adjustmentType: 'Salary Increase',
  adjustmentName: '',
  amount: '',
  isAddition: true,
  effectiveDate: '',
  remarks: '',
});

const errors = ref<Record<string, string>>({});

const adjustmentTypes = [
  'Salary Increase',
  'Step Increment',
  'Retroactive Pay',
  'Correction',
  'Other'
];

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.employeeId) {
    errors.value.employeeId = 'Employee is required';
  }

  if (!formData.value.adjustmentType) {
    errors.value.adjustmentType = 'Adjustment type is required';
  }

  if (!formData.value.adjustmentName) {
    errors.value.adjustmentName = 'Adjustment name is required';
  }

  const amount = parseFloat(formData.value.amount);
  if (!formData.value.amount || amount <= 0) {
    errors.value.amount = 'Amount must be greater than 0';
  }

  if (!formData.value.effectiveDate) {
    errors.value.effectiveDate = 'Effective date is required';
  }

  return Object.keys(errors.value).length === 0;
}

function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  props.onSubmit({
    ...formData.value,
    amount: parseFloat(formData.value.amount),
  });
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <!-- Employee Selection Section -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Employee Information</h3>

      <div>
        <label for="employeeId" class="block text-sm font-medium text-gray-700 mb-1">
          Employee <span class="text-red-500">*</span>
        </label>
        <select
          id="employeeId"
          v-model="formData.employeeId"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          :class="{ 'border-red-500': errors.employeeId }"
        >
          <option :value="null">Select an employee</option>
          <option
            v-for="employee in employees"
            :key="employee.id"
            :value="employee.id"
          >
            {{ employee.employeeNo }} - {{ employee.firstName }} {{ employee.lastName }}
          </option>
        </select>
        <p v-if="errors.employeeId" class="mt-1 text-sm text-red-600">
          {{ errors.employeeId }}
        </p>
      </div>
    </div>

    <!-- Adjustment Details Section -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Adjustment Details</h3>

      <div class="grid md:grid-cols-2 gap-4">
        <!-- Adjustment Type -->
        <div>
          <label for="adjustmentType" class="block text-sm font-medium text-gray-700 mb-1">
            Adjustment Type <span class="text-red-500">*</span>
          </label>
          <select
            id="adjustmentType"
            v-model="formData.adjustmentType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.adjustmentType }"
          >
            <option v-for="type in adjustmentTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
          <p v-if="errors.adjustmentType" class="mt-1 text-sm text-red-600">
            {{ errors.adjustmentType }}
          </p>
        </div>

        <!-- Adjustment Name -->
        <div>
          <label for="adjustmentName" class="block text-sm font-medium text-gray-700 mb-1">
            Adjustment Name <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="adjustmentName"
            v-model="formData.adjustmentName"
            placeholder="e.g., January 2026 Salary Increase"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.adjustmentName }"
          />
          <p v-if="errors.adjustmentName" class="mt-1 text-sm text-red-600">
            {{ errors.adjustmentName }}
          </p>
        </div>

        <!-- Amount -->
        <div>
          <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
            Amount <span class="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="amount"
            v-model="formData.amount"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.amount }"
          />
          <p v-if="errors.amount" class="mt-1 text-sm text-red-600">
            {{ errors.amount }}
          </p>
        </div>

        <!-- Effective Date -->
        <div>
          <label for="effectiveDate" class="block text-sm font-medium text-gray-700 mb-1">
            Effective Date <span class="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="effectiveDate"
            v-model="formData.effectiveDate"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.effectiveDate }"
          />
          <p v-if="errors.effectiveDate" class="mt-1 text-sm text-red-600">
            {{ errors.effectiveDate }}
          </p>
        </div>

        <!-- Is Addition Checkbox -->
        <div class="md:col-span-2">
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="formData.isAddition"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span class="ml-2 text-sm font-medium text-gray-700">
              This is an addition to salary (uncheck for deduction)
            </span>
          </label>
          <p class="mt-1 text-xs text-gray-500">
            {{ formData.isAddition ? 'This amount will be added to the employee\'s payroll' : 'This amount will be deducted from the employee\'s payroll' }}
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
          placeholder="Reason for adjustment, approval details, etc..."
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
        Create Adjustment
      </button>
    </div>
  </form>
</template>
