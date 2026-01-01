<template>
  <div class="iot-form">
    <form @submit.prevent="submitForm">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Employee Selection -->
        <div class="form-group col-span-2">
          <label for="employee" class="form-label required">Employee/Traveler</label>
          <select
            id="employee"
            v-model="formData.employeeId"
            class="form-select"
            required
            :disabled="isSubmitting"
          >
            <option value="">Select Employee</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.employeeNo }} - {{ emp.firstName }} {{ emp.lastName }}
            </option>
          </select>
          <span v-if="errors.employeeId" class="error-message">{{ errors.employeeId }}</span>
        </div>

        <!-- Fund Cluster -->
        <div class="form-group">
          <label for="fundCluster" class="form-label required">Fund Cluster</label>
          <select
            id="fundCluster"
            v-model="formData.fundClusterId"
            class="form-select"
            required
            :disabled="isSubmitting"
          >
            <option value="">Select Fund Cluster</option>
            <option v-for="fc in fundClusters" :key="fc.id" :value="fc.id">
              {{ fc.code }} - {{ fc.name }}
            </option>
          </select>
          <span v-if="errors.fundClusterId" class="error-message">{{ errors.fundClusterId }}</span>
        </div>

        <!-- Destination -->
        <div class="form-group">
          <label for="destination" class="form-label required">Destination</label>
          <input
            id="destination"
            v-model="formData.destination"
            type="text"
            class="form-input"
            placeholder="Enter destination (city, province, region)"
            required
            :disabled="isSubmitting"
          />
          <span v-if="errors.destination" class="error-message">{{ errors.destination }}</span>
        </div>

        <!-- Travel Purpose -->
        <div class="form-group col-span-2">
          <label for="purpose" class="form-label required">Purpose of Travel</label>
          <textarea
            id="purpose"
            v-model="formData.purpose"
            class="form-textarea"
            rows="3"
            placeholder="Describe the purpose of the travel..."
            required
            :disabled="isSubmitting"
          ></textarea>
          <span v-if="errors.purpose" class="error-message">{{ errors.purpose }}</span>
        </div>

        <!-- Departure Date -->
        <div class="form-group">
          <label for="departureDate" class="form-label required">Departure Date</label>
          <input
            id="departureDate"
            v-model="formData.departureDate"
            type="datetime-local"
            class="form-input"
            required
            :disabled="isSubmitting"
          />
          <span v-if="errors.departureDate" class="error-message">{{ errors.departureDate }}</span>
        </div>

        <!-- Return Date -->
        <div class="form-group">
          <label for="returnDate" class="form-label required">Return Date</label>
          <input
            id="returnDate"
            v-model="formData.returnDate"
            type="datetime-local"
            class="form-input"
            required
            :disabled="isSubmitting"
          />
          <span v-if="errors.returnDate" class="error-message">{{ errors.returnDate }}</span>
        </div>

        <!-- Itinerary Builder -->
        <div class="form-group col-span-2">
          <label class="form-label required">Itinerary Details</label>
          <div class="itinerary-list">
            <div
              v-for="(item, index) in formData.itineraryBefore"
              :key="index"
              class="itinerary-item"
            >
              <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div class="md:col-span-3">
                  <input
                    v-model="item.date"
                    type="date"
                    class="form-input"
                    placeholder="Date"
                    required
                  />
                </div>
                <div class="md:col-span-4">
                  <input
                    v-model="item.location"
                    type="text"
                    class="form-input"
                    placeholder="Location"
                    required
                  />
                </div>
                <div class="md:col-span-4">
                  <input
                    v-model="item.activity"
                    type="text"
                    class="form-input"
                    placeholder="Activity"
                    required
                  />
                </div>
                <div class="md:col-span-1">
                  <button
                    type="button"
                    @click="removeItineraryItem(index)"
                    class="btn-danger btn-sm"
                    :disabled="formData.itineraryBefore.length === 1"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            @click="addItineraryItem"
            class="btn-secondary btn-sm mt-2"
            :disabled="isSubmitting"
          >
            + Add Itinerary Item
          </button>
        </div>

        <!-- Estimated Cost -->
        <div class="form-group">
          <label for="estimatedCost" class="form-label required">Estimated Total Cost</label>
          <div class="input-group">
            <span class="input-group-text">₱</span>
            <input
              id="estimatedCost"
              v-model.number="formData.estimatedCost"
              type="number"
              step="0.01"
              min="0"
              class="form-input"
              placeholder="0.00"
              required
              :disabled="isSubmitting"
            />
          </div>
          <span v-if="errors.estimatedCost" class="error-message">{{ errors.estimatedCost }}</span>
        </div>

        <!-- Cash Advance Request -->
        <div class="form-group">
          <label for="cashAdvanceAmount" class="form-label">Cash Advance Requested</label>
          <div class="input-group">
            <span class="input-group-text">₱</span>
            <input
              id="cashAdvanceAmount"
              v-model.number="formData.cashAdvanceAmount"
              type="number"
              step="0.01"
              min="0"
              :max="formData.estimatedCost"
              class="form-input"
              placeholder="0.00 (optional)"
              :disabled="isSubmitting"
            />
          </div>
          <small class="form-hint">Cash advance cannot exceed estimated cost</small>
          <span v-if="errors.cashAdvanceAmount" class="error-message">{{ errors.cashAdvanceAmount }}</span>
        </div>

        <!-- Breakdown Section -->
        <div class="col-span-2 bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold mb-3">Cost Breakdown (Optional)</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Transportation</label>
              <input
                v-model.number="breakdown.transportation"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="₱ 0.00"
              />
            </div>
            <div>
              <label class="form-label">Lodging</label>
              <input
                v-model.number="breakdown.lodging"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="₱ 0.00"
              />
            </div>
            <div>
              <label class="form-label">Meals & Incidentals</label>
              <input
                v-model.number="breakdown.meals"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="₱ 0.00"
              />
            </div>
            <div>
              <label class="form-label">Registration Fees</label>
              <input
                v-model.number="breakdown.registration"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="₱ 0.00"
              />
            </div>
            <div>
              <label class="form-label">Other Expenses</label>
              <input
                v-model.number="breakdown.others"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="₱ 0.00"
              />
            </div>
            <div class="flex items-end">
              <div class="w-full">
                <label class="form-label font-semibold">Total Breakdown</label>
                <input
                  :value="formatCurrency(breakdownTotal)"
                  type="text"
                  class="form-input bg-gray-100 font-bold"
                  readonly
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Form Actions -->
      <div class="form-actions mt-6 flex gap-3">
        <button
          type="submit"
          class="btn-primary"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">Saving...</span>
          <span v-else>{{ mode === 'create' ? 'Create IoT' : 'Update IoT' }}</span>
        </button>
        <button
          v-if="mode === 'create'"
          type="button"
          @click="submitAndApprove"
          class="btn-success"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">Saving...</span>
          <span v-else>Create & Submit for Approval</span>
        </button>
        <button
          type="button"
          @click="cancel"
          class="btn-secondary"
          :disabled="isSubmitting"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  mode?: 'create' | 'edit';
  initialData?: any;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
});

const emit = defineEmits(['submit', 'cancel']);

const isSubmitting = ref(false);
const employees = ref<any[]>([]);
const fundClusters = ref<any[]>([]);
const errors = ref<Record<string, string>>({});

const formData = ref({
  employeeId: '',
  fundClusterId: '',
  purpose: '',
  departureDate: '',
  returnDate: '',
  destination: '',
  itineraryBefore: [
    { date: '', location: '', activity: '' }
  ],
  estimatedCost: 0,
  cashAdvanceAmount: 0,
});

const breakdown = ref({
  transportation: 0,
  lodging: 0,
  meals: 0,
  registration: 0,
  others: 0,
});

const breakdownTotal = computed(() => {
  return breakdown.value.transportation +
    breakdown.value.lodging +
    breakdown.value.meals +
    breakdown.value.registration +
    breakdown.value.others;
});

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(value);
};

const addItineraryItem = () => {
  formData.value.itineraryBefore.push({
    date: '',
    location: '',
    activity: ''
  });
};

const removeItineraryItem = (index: number) => {
  if (formData.value.itineraryBefore.length > 1) {
    formData.value.itineraryBefore.splice(index, 1);
  }
};

const validateForm = () => {
  errors.value = {};
  let isValid = true;

  if (!formData.value.employeeId) {
    errors.value.employeeId = 'Employee is required';
    isValid = false;
  }

  if (!formData.value.fundClusterId) {
    errors.value.fundClusterId = 'Fund cluster is required';
    isValid = false;
  }

  if (!formData.value.destination) {
    errors.value.destination = 'Destination is required';
    isValid = false;
  }

  if (!formData.value.purpose) {
    errors.value.purpose = 'Purpose is required';
    isValid = false;
  }

  if (!formData.value.departureDate) {
    errors.value.departureDate = 'Departure date is required';
    isValid = false;
  }

  if (!formData.value.returnDate) {
    errors.value.returnDate = 'Return date is required';
    isValid = false;
  }

  if (formData.value.departureDate && formData.value.returnDate) {
    if (new Date(formData.value.returnDate) <= new Date(formData.value.departureDate)) {
      errors.value.returnDate = 'Return date must be after departure date';
      isValid = false;
    }
  }

  if (!formData.value.estimatedCost || formData.value.estimatedCost <= 0) {
    errors.value.estimatedCost = 'Estimated cost must be greater than 0';
    isValid = false;
  }

  if (formData.value.cashAdvanceAmount > formData.value.estimatedCost) {
    errors.value.cashAdvanceAmount = 'Cash advance cannot exceed estimated cost';
    isValid = false;
  }

  return isValid;
};

const submitForm = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    emit('submit', {
      ...formData.value,
      submitForApproval: false
    });
  } catch (error) {
    console.error('Error submitting form:', error);
  } finally {
    isSubmitting.value = false;
  }
};

const submitAndApprove = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    emit('submit', {
      ...formData.value,
      submitForApproval: true
    });
  } catch (error) {
    console.error('Error submitting form:', error);
  } finally {
    isSubmitting.value = false;
  }
};

const cancel = () => {
  emit('cancel');
};

const loadEmployees = async () => {
  try {
    const response = await fetch('/api/users?active=true');
    const data = await response.json();
    employees.value = data.users || [];
  } catch (error) {
    console.error('Error loading employees:', error);
  }
};

const loadFundClusters = async () => {
  try {
    const response = await fetch('/api/fund-clusters?active=true');
    const data = await response.json();
    fundClusters.value = data.fundClusters || [];
  } catch (error) {
    console.error('Error loading fund clusters:', error);
  }
};

onMounted(() => {
  loadEmployees();
  loadFundClusters();

  if (props.initialData) {
    formData.value = { ...formData.value, ...props.initialData };
  }
});
</script>

<style scoped>
.iot-form {
  @apply bg-white p-6 rounded-lg shadow;
}

.form-group {
  @apply mb-4;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.form-label.required::after {
  content: ' *';
  @apply text-red-500;
}

.form-input,
.form-select,
.form-textarea {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.form-input:disabled,
.form-select:disabled,
.form-textarea:disabled {
  @apply bg-gray-100 cursor-not-allowed;
}

.form-hint {
  @apply block text-xs text-gray-500 mt-1;
}

.error-message {
  @apply block text-sm text-red-600 mt-1;
}

.input-group {
  @apply flex;
}

.input-group-text {
  @apply inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-700 rounded-l-md;
}

.input-group .form-input {
  @apply rounded-l-none;
}

.itinerary-list {
  @apply space-y-3;
}

.itinerary-item {
  @apply border border-gray-200 p-3 rounded-md;
}

.btn-primary,
.btn-secondary,
.btn-success,
.btn-danger {
  @apply px-4 py-2 rounded-md font-medium transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.btn-primary:disabled {
  @apply bg-blue-300 cursor-not-allowed;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
}

.btn-success {
  @apply bg-green-600 text-white hover:bg-green-700;
}

.btn-success:disabled {
  @apply bg-green-300 cursor-not-allowed;
}

.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.btn-sm {
  @apply px-2 py-1 text-sm;
}

.form-actions {
  @apply flex gap-3 pt-4 border-t border-gray-200;
}
</style>
