<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  employees?: any[];
}

const props = defineProps<Props>();

const formData = ref({
  employeeId: null,
  deductionType: 'GSIS Loan',
  deductionName: '',
  amount: '',
  installments: '',
  startDate: '',
  remarks: '',
});

const errors = ref<Record<string, string>>({});

const deductionTypes = ['GSIS Loan', 'Pag-IBIG Loan', 'Salary Loan', 'Other'];

const amountPerInstallment = computed(() => {
  const amount = parseFloat(formData.value.amount || '0');
  const installments = parseInt(formData.value.installments || '0');

  if (amount > 0 && installments > 0) {
    return (amount / installments).toFixed(2);
  }

  return '0.00';
});

const estimatedEndDate = computed(() => {
  if (!formData.value.startDate || !formData.value.installments) {
    return '-';
  }

  const startDate = new Date(formData.value.startDate);
  const installments = parseInt(formData.value.installments);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + installments);

  return endDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
});

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.employeeId) {
    errors.value.employeeId = 'Employee is required';
  }

  if (!formData.value.deductionType) {
    errors.value.deductionType = 'Deduction type is required';
  }

  if (!formData.value.deductionName) {
    errors.value.deductionName = 'Deduction name is required';
  }

  const amount = parseFloat(formData.value.amount);
  if (!formData.value.amount || amount <= 0) {
    errors.value.amount = 'Total amount must be greater than 0';
  }

  const installments = parseInt(formData.value.installments);
  if (!formData.value.installments || installments <= 0) {
    errors.value.installments = 'Installments must be greater than 0';
  }

  if (!formData.value.startDate) {
    errors.value.startDate = 'Start date is required';
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
    installments: parseInt(formData.value.installments),
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

    <!-- Deduction Details Section -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Deduction Details</h3>

      <div class="grid md:grid-cols-2 gap-4">
        <!-- Deduction Type -->
        <div>
          <label for="deductionType" class="block text-sm font-medium text-gray-700 mb-1">
            Deduction Type <span class="text-red-500">*</span>
          </label>
          <select
            id="deductionType"
            v-model="formData.deductionType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.deductionType }"
          >
            <option v-for="type in deductionTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
          <p v-if="errors.deductionType" class="mt-1 text-sm text-red-600">
            {{ errors.deductionType }}
          </p>
        </div>

        <!-- Deduction Name -->
        <div>
          <label for="deductionName" class="block text-sm font-medium text-gray-700 mb-1">
            Deduction Name <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="deductionName"
            v-model="formData.deductionName"
            placeholder="e.g., Housing Loan"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.deductionName }"
          />
          <p v-if="errors.deductionName" class="mt-1 text-sm text-red-600">
            {{ errors.deductionName }}
          </p>
        </div>

        <!-- Total Amount -->
        <div>
          <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
            Total Amount <span class="text-red-500">*</span>
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

        <!-- Installments -->
        <div>
          <label for="installments" class="block text-sm font-medium text-gray-700 mb-1">
            Number of Installments <span class="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="installments"
            v-model="formData.installments"
            min="1"
            placeholder="12"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.installments }"
          />
          <p v-if="errors.installments" class="mt-1 text-sm text-red-600">
            {{ errors.installments }}
          </p>
        </div>

        <!-- Start Date -->
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span class="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="startDate"
            v-model="formData.startDate"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.startDate }"
          />
          <p v-if="errors.startDate" class="mt-1 text-sm text-red-600">
            {{ errors.startDate }}
          </p>
        </div>
      </div>
    </div>

    <!-- Calculation Summary -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 class="text-lg font-semibold text-blue-900 mb-3">Deduction Summary</h3>

      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-blue-700">Amount per Installment</p>
          <p class="text-xl font-bold text-blue-900">₱{{ amountPerInstallment }}</p>
        </div>

        <div>
          <p class="text-sm text-blue-700">Estimated End Date</p>
          <p class="text-xl font-bold text-blue-900">{{ estimatedEndDate }}</p>
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
        Create Deduction
      </button>
    </div>
  </form>
</template>
