<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  employeeId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits(['submit', 'cancel']);

const formData = ref({
  employeeNo: '',
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  dateOfBirth: '',
  civilStatus: 'Single' as 'Single' | 'Married' | 'Widowed' | 'Separated',
  gender: 'Male' as 'Male' | 'Female',
  position: '',
  salaryGrade: '',
  stepIncrement: 1,
  appointmentStatus: 'Permanent' as 'Permanent' | 'Temporary' | 'Casual' | 'Contractual' | 'Co-terminus',
  dateHired: '',
  dateRegularized: '',
  basicSalary: '',
  pera: '2000',
  additionalAllowance: '0',
  tinNo: '',
  gsisNo: '',
  philhealthNo: '',
  pagibigNo: '',
  bankName: '',
  bankAccountNo: '',
  bankAccountName: '',
  mobileNo: '',
  email: '',
  address: '',
  taxExemptionCode: 'S' as string,
  numberOfDependents: 0,
});

const loading = ref(false);
const errors = ref<Record<string, string>>({});

const fullName = computed(() => {
  const parts = [
    formData.value.firstName,
    formData.value.middleName,
    formData.value.lastName,
    formData.value.suffix,
  ].filter(Boolean);
  return parts.join(' ');
});

onMounted(async () => {
  if (props.employeeId) {
    await loadEmployee();
  }
});

async function loadEmployee() {
  try {
    const response = await fetch(`/api/payroll/employees/${props.employeeId}`);
    if (response.ok) {
      const employee = await response.json();
      Object.assign(formData.value, {
        ...employee,
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : '',
        dateHired: employee.dateHired ? employee.dateHired.split('T')[0] : '',
        dateRegularized: employee.dateRegularized ? employee.dateRegularized.split('T')[0] : '',
      });
    }
  } catch (error) {
    console.error('Error loading employee:', error);
  }
}

function validateForm(): boolean {
  errors.value = {};

  if (!formData.value.firstName) {
    errors.value.firstName = 'First name is required';
  }

  if (!formData.value.lastName) {
    errors.value.lastName = 'Last name is required';
  }

  if (!formData.value.position) {
    errors.value.position = 'Position is required';
  }

  if (!formData.value.dateHired) {
    errors.value.dateHired = 'Date hired is required';
  }

  if (!formData.value.basicSalary || parseFloat(formData.value.basicSalary) <= 0) {
    errors.value.basicSalary = 'Valid basic salary is required';
  }

  if (formData.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = 'Invalid email format';
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
    <!-- Personal Information Section -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="firstName" class="block text-sm font-medium text-gray-700">
            First Name <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            v-model="formData.firstName"
            maxlength="100"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.firstName }"
          />
          <p v-if="errors.firstName" class="mt-1 text-sm text-red-600">{{ errors.firstName }}</p>
        </div>

        <div>
          <label for="middleName" class="block text-sm font-medium text-gray-700">
            Middle Name
          </label>
          <input
            type="text"
            id="middleName"
            v-model="formData.middleName"
            maxlength="100"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="lastName" class="block text-sm font-medium text-gray-700">
            Last Name <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            v-model="formData.lastName"
            maxlength="100"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.lastName }"
          />
          <p v-if="errors.lastName" class="mt-1 text-sm text-red-600">{{ errors.lastName }}</p>
        </div>

        <div>
          <label for="suffix" class="block text-sm font-medium text-gray-700">
            Suffix
          </label>
          <input
            type="text"
            id="suffix"
            v-model="formData.suffix"
            maxlength="20"
            placeholder="Jr., Sr., III, etc."
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="dateOfBirth" class="block text-sm font-medium text-gray-700">
            Date of Birth
          </label>
          <input
            type="date"
            id="dateOfBirth"
            v-model="formData.dateOfBirth"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="gender" class="block text-sm font-medium text-gray-700">
            Gender
          </label>
          <select
            id="gender"
            v-model="formData.gender"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div>
          <label for="civilStatus" class="block text-sm font-medium text-gray-700">
            Civil Status
          </label>
          <select
            id="civilStatus"
            v-model="formData.civilStatus"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Employment Information Section -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Employment Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="position" class="block text-sm font-medium text-gray-700">
            Position <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="position"
            v-model="formData.position"
            maxlength="100"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.position }"
          />
          <p v-if="errors.position" class="mt-1 text-sm text-red-600">{{ errors.position }}</p>
        </div>

        <div>
          <label for="salaryGrade" class="block text-sm font-medium text-gray-700">
            Salary Grade
          </label>
          <input
            type="text"
            id="salaryGrade"
            v-model="formData.salaryGrade"
            maxlength="20"
            placeholder="e.g., SG-15"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="stepIncrement" class="block text-sm font-medium text-gray-700">
            Step Increment
          </label>
          <input
            type="number"
            id="stepIncrement"
            v-model.number="formData.stepIncrement"
            min="1"
            max="8"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="appointmentStatus" class="block text-sm font-medium text-gray-700">
            Appointment Status
          </label>
          <select
            id="appointmentStatus"
            v-model="formData.appointmentStatus"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="Permanent">Permanent</option>
            <option value="Temporary">Temporary</option>
            <option value="Casual">Casual</option>
            <option value="Contractual">Contractual</option>
            <option value="Co-terminus">Co-terminus</option>
          </select>
        </div>

        <div>
          <label for="dateHired" class="block text-sm font-medium text-gray-700">
            Date Hired <span class="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="dateHired"
            v-model="formData.dateHired"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.dateHired }"
          />
          <p v-if="errors.dateHired" class="mt-1 text-sm text-red-600">{{ errors.dateHired }}</p>
        </div>

        <div>
          <label for="dateRegularized" class="block text-sm font-medium text-gray-700">
            Date Regularized
          </label>
          <input
            type="date"
            id="dateRegularized"
            v-model="formData.dateRegularized"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>

    <!-- Salary Information Section -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Salary Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="basicSalary" class="block text-sm font-medium text-gray-700">
            Basic Salary <span class="text-red-500">*</span>
          </label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="text-gray-500 sm:text-sm">₱</span>
            </div>
            <input
              type="number"
              id="basicSalary"
              v-model="formData.basicSalary"
              step="0.01"
              min="0"
              class="block w-full pl-7 rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              :class="{ 'border-red-500': errors.basicSalary }"
            />
          </div>
          <p v-if="errors.basicSalary" class="mt-1 text-sm text-red-600">{{ errors.basicSalary }}</p>
        </div>

        <div>
          <label for="pera" class="block text-sm font-medium text-gray-700">
            PERA (Personnel Economic Relief Allowance)
          </label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="text-gray-500 sm:text-sm">₱</span>
            </div>
            <input
              type="number"
              id="pera"
              v-model="formData.pera"
              step="0.01"
              min="0"
              class="block w-full pl-7 rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label for="additionalAllowance" class="block text-sm font-medium text-gray-700">
            Additional Allowance
          </label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="text-gray-500 sm:text-sm">₱</span>
            </div>
            <input
              type="number"
              id="additionalAllowance"
              v-model="formData.additionalAllowance"
              step="0.01"
              min="0"
              class="block w-full pl-7 rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Government IDs Section -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Government IDs & Contributions</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="tinNo" class="block text-sm font-medium text-gray-700">
            TIN (Tax Identification Number)
          </label>
          <input
            type="text"
            id="tinNo"
            v-model="formData.tinNo"
            maxlength="20"
            placeholder="000-000-000-000"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="gsisNo" class="block text-sm font-medium text-gray-700">
            GSIS Number
          </label>
          <input
            type="text"
            id="gsisNo"
            v-model="formData.gsisNo"
            maxlength="20"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="philhealthNo" class="block text-sm font-medium text-gray-700">
            PhilHealth Number
          </label>
          <input
            type="text"
            id="philhealthNo"
            v-model="formData.philhealthNo"
            maxlength="20"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="pagibigNo" class="block text-sm font-medium text-gray-700">
            Pag-IBIG Number
          </label>
          <input
            type="text"
            id="pagibigNo"
            v-model="formData.pagibigNo"
            maxlength="20"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>

    <!-- Tax Information Section -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Tax Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="taxExemptionCode" class="block text-sm font-medium text-gray-700">
            Tax Exemption Code
          </label>
          <select
            id="taxExemptionCode"
            v-model="formData.taxExemptionCode"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="S">S - Single</option>
            <option value="S1">S1 - Single with 1 Dependent</option>
            <option value="S2">S2 - Single with 2 Dependents</option>
            <option value="S3">S3 - Single with 3 Dependents</option>
            <option value="S4">S4 - Single with 4 Dependents</option>
            <option value="ME">ME - Married Employee</option>
            <option value="ME1">ME1 - Married Employee with 1 Dependent</option>
            <option value="ME2">ME2 - Married Employee with 2 Dependents</option>
            <option value="ME3">ME3 - Married Employee with 3 Dependents</option>
            <option value="ME4">ME4 - Married Employee with 4 Dependents</option>
            <option value="Z">Z - Zero Withholding</option>
          </select>
        </div>

        <div>
          <label for="numberOfDependents" class="block text-sm font-medium text-gray-700">
            Number of Dependents
          </label>
          <input
            type="number"
            id="numberOfDependents"
            v-model.number="formData.numberOfDependents"
            min="0"
            max="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <p class="mt-1 text-xs text-gray-500">Maximum of 4 dependents for tax exemption</p>
        </div>
      </div>
    </div>

    <!-- Bank Information Section -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Bank Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="bankName" class="block text-sm font-medium text-gray-700">
            Bank Name
          </label>
          <input
            type="text"
            id="bankName"
            v-model="formData.bankName"
            maxlength="100"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="bankAccountNo" class="block text-sm font-medium text-gray-700">
            Account Number
          </label>
          <input
            type="text"
            id="bankAccountNo"
            v-model="formData.bankAccountNo"
            maxlength="50"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="bankAccountName" class="block text-sm font-medium text-gray-700">
            Account Name
          </label>
          <input
            type="text"
            id="bankAccountName"
            v-model="formData.bankAccountName"
            maxlength="200"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>

    <!-- Contact Information Section -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="mobileNo" class="block text-sm font-medium text-gray-700">
            Mobile Number
          </label>
          <input
            type="text"
            id="mobileNo"
            v-model="formData.mobileNo"
            maxlength="20"
            placeholder="09XX-XXX-XXXX"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            v-model="formData.email"
            maxlength="255"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            :class="{ 'border-red-500': errors.email }"
          />
          <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
        </div>

        <div class="md:col-span-2">
          <label for="address" class="block text-sm font-medium text-gray-700">
            Address
          </label>
          <textarea
            id="address"
            v-model="formData.address"
            rows="2"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          ></textarea>
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
        <span v-if="loading">Saving...</span>
        <span v-else>{{ employeeId ? 'Update Employee' : 'Add Employee' }}</span>
      </button>
    </div>
  </form>
</template>
