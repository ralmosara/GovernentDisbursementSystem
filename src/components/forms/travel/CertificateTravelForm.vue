<template>
  <div class="ctc-form">
    <form @submit.prevent="submitForm">

      <!-- Travel Information Display -->
      <div v-if="iotData" class="travel-info-card mb-6">
        <h3 class="section-title">Travel Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="info-item">
            <label class="info-label">IoT Number:</label>
            <span class="info-value">{{ iotData.iotNo }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Employee:</label>
            <span class="info-value">{{ iotData.employeeName }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Destination:</label>
            <span class="info-value">{{ iotData.destination }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Purpose:</label>
            <span class="info-value">{{ iotData.purpose }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Planned Departure:</label>
            <span class="info-value">{{ formatDate(iotData.departureDate) }}</span>
          </div>
          <div class="info-item">
            <label class="info-label">Planned Return:</label>
            <span class="info-value">{{ formatDate(iotData.returnDate) }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Travel Completed Status -->
        <div class="form-group col-span-2">
          <div class="flex items-center gap-3">
            <input
              id="travelCompleted"
              v-model="formData.travelCompleted"
              type="checkbox"
              class="form-checkbox h-5 w-5"
              :disabled="isSubmitting"
            />
            <label for="travelCompleted" class="form-label-inline font-semibold">
              I certify that the travel has been completed as planned
            </label>
          </div>
          <span v-if="errors.travelCompleted" class="error-message">{{ errors.travelCompleted }}</span>
        </div>

        <!-- Actual Departure Date -->
        <div class="form-group">
          <label for="actualDepartureDate" class="form-label required">Actual Departure Date & Time</label>
          <input
            id="actualDepartureDate"
            v-model="formData.actualDepartureDate"
            type="datetime-local"
            class="form-input"
            required
            :disabled="isSubmitting"
          />
          <span v-if="errors.actualDepartureDate" class="error-message">{{ errors.actualDepartureDate }}</span>
        </div>

        <!-- Actual Return Date -->
        <div class="form-group">
          <label for="actualReturnDate" class="form-label required">Actual Return Date & Time</label>
          <input
            id="actualReturnDate"
            v-model="formData.actualReturnDate"
            type="datetime-local"
            class="form-input"
            required
            :disabled="isSubmitting"
          />
          <span v-if="errors.actualReturnDate" class="error-message">{{ errors.actualReturnDate }}</span>
        </div>

        <!-- Duration Comparison -->
        <div v-if="formData.actualDepartureDate && formData.actualReturnDate" class="col-span-2 bg-blue-50 p-4 rounded-lg">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="info-label">Planned Duration:</label>
              <span class="info-value font-semibold">{{ plannedDuration }}</span>
            </div>
            <div>
              <label class="info-label">Actual Duration:</label>
              <span class="info-value font-semibold">{{ actualDuration }}</span>
            </div>
            <div>
              <label class="info-label">Variance:</label>
              <span class="info-value font-semibold" :class="varianceClass">{{ durationVariance }}</span>
            </div>
          </div>
        </div>

        <!-- Completion Remarks -->
        <div class="form-group col-span-2">
          <label for="completionRemarks" class="form-label">Completion Remarks/Notes</label>
          <textarea
            id="completionRemarks"
            v-model="formData.completionRemarks"
            class="form-textarea"
            rows="4"
            placeholder="Enter any remarks about the travel completion (optional)..."
            :disabled="isSubmitting"
          ></textarea>
          <small class="form-hint">
            Include any significant events, changes from the itinerary, or issues encountered during travel
          </small>
        </div>

        <!-- Actual Itinerary (Optional) -->
        <div class="form-group col-span-2">
          <label class="form-label">Actual Itinerary (Optional)</label>
          <p class="text-sm text-gray-600 mb-3">
            If the actual itinerary differed from the planned one, you can update it here.
          </p>
          <div class="itinerary-list">
            <div
              v-for="(item, index) in formData.actualItinerary"
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
                  />
                </div>
                <div class="md:col-span-4">
                  <input
                    v-model="item.location"
                    type="text"
                    class="form-input"
                    placeholder="Location"
                  />
                </div>
                <div class="md:col-span-4">
                  <input
                    v-model="item.activity"
                    type="text"
                    class="form-input"
                    placeholder="Activity"
                  />
                </div>
                <div class="md:col-span-1">
                  <button
                    type="button"
                    @click="removeItineraryItem(index)"
                    class="btn-danger btn-sm"
                    :disabled="formData.actualItinerary.length === 1"
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

        <!-- Certification Section -->
        <div class="col-span-2 bg-gray-50 p-4 rounded-lg">
          <h3 class="font-semibold mb-3">Certification</h3>
          <div class="space-y-3">
            <div class="flex items-start gap-3">
              <input
                id="certifyAccurate"
                v-model="formData.certifyAccurate"
                type="checkbox"
                class="form-checkbox h-5 w-5 mt-1"
                :disabled="isSubmitting"
              />
              <label for="certifyAccurate" class="text-sm">
                I certify that the information provided above is accurate and complete to the best of my knowledge
              </label>
            </div>
            <div class="flex items-start gap-3">
              <input
                id="certifyCompleted"
                v-model="formData.certifyCompleted"
                type="checkbox"
                class="form-checkbox h-5 w-5 mt-1"
                :disabled="isSubmitting"
              />
              <label for="certifyCompleted" class="text-sm">
                I certify that the official travel order has been fully accomplished
              </label>
            </div>
          </div>
        </div>

      </div>

      <!-- Form Actions -->
      <div class="form-actions mt-6 flex gap-3">
        <button
          type="submit"
          class="btn-primary"
          :disabled="isSubmitting || !canSubmit"
        >
          <span v-if="isSubmitting">Saving...</span>
          <span v-else>Submit Certificate</span>
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
  iotId: number;
  iotData?: any;
}

const props = defineProps<Props>();
const emit = defineEmits(['submit', 'cancel']);

const isSubmitting = ref(false);
const errors = ref<Record<string, string>>({});

const formData = ref({
  travelCompleted: false,
  actualDepartureDate: '',
  actualReturnDate: '',
  completionRemarks: '',
  actualItinerary: [] as any[],
  certifyAccurate: false,
  certifyCompleted: false,
});

const canSubmit = computed(() => {
  return formData.value.travelCompleted &&
         formData.value.certifyAccurate &&
         formData.value.certifyCompleted;
});

const formatDate = (date: string | Date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const calculateDuration = (start: string | Date, end: string | Date) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
  return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
};

const plannedDuration = computed(() => {
  if (props.iotData?.departureDate && props.iotData?.returnDate) {
    return calculateDuration(props.iotData.departureDate, props.iotData.returnDate);
  }
  return 'N/A';
});

const actualDuration = computed(() => {
  if (formData.value.actualDepartureDate && formData.value.actualReturnDate) {
    return calculateDuration(formData.value.actualDepartureDate, formData.value.actualReturnDate);
  }
  return 'N/A';
});

const durationVariance = computed(() => {
  if (!props.iotData?.departureDate || !formData.value.actualDepartureDate) {
    return 'N/A';
  }

  const plannedMs = new Date(props.iotData.returnDate).getTime() - new Date(props.iotData.departureDate).getTime();
  const actualMs = new Date(formData.value.actualReturnDate).getTime() - new Date(formData.value.actualDepartureDate).getTime();
  const diffMs = actualMs - plannedMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffMs === 0) return 'On time';
  if (diffMs > 0) {
    return `+${diffDays}d ${diffHours}h (Extended)`;
  }
  return `${diffDays}d ${diffHours}h (Shorter)`;
});

const varianceClass = computed(() => {
  const variance = durationVariance.value;
  if (variance === 'On time') return 'text-green-600';
  if (variance.includes('Extended')) return 'text-amber-600';
  if (variance.includes('Shorter')) return 'text-blue-600';
  return 'text-gray-600';
});

const addItineraryItem = () => {
  formData.value.actualItinerary.push({
    date: '',
    location: '',
    activity: ''
  });
};

const removeItineraryItem = (index: number) => {
  if (formData.value.actualItinerary.length > 1) {
    formData.value.actualItinerary.splice(index, 1);
  }
};

const validateForm = () => {
  errors.value = {};
  let isValid = true;

  if (!formData.value.travelCompleted) {
    errors.value.travelCompleted = 'You must confirm that travel was completed';
    isValid = false;
  }

  if (!formData.value.actualDepartureDate) {
    errors.value.actualDepartureDate = 'Actual departure date is required';
    isValid = false;
  }

  if (!formData.value.actualReturnDate) {
    errors.value.actualReturnDate = 'Actual return date is required';
    isValid = false;
  }

  if (formData.value.actualDepartureDate && formData.value.actualReturnDate) {
    if (new Date(formData.value.actualReturnDate) <= new Date(formData.value.actualDepartureDate)) {
      errors.value.actualReturnDate = 'Return date must be after departure date';
      isValid = false;
    }
  }

  if (!formData.value.certifyAccurate || !formData.value.certifyCompleted) {
    errors.value.travelCompleted = 'You must check both certification boxes';
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
      iotId: props.iotId,
      ...formData.value
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

onMounted(() => {
  if (props.iotData?.itineraryBefore) {
    formData.value.actualItinerary = JSON.parse(JSON.stringify(props.iotData.itineraryBefore));
  } else {
    formData.value.actualItinerary = [{ date: '', location: '', activity: '' }];
  }
});
</script>

<style scoped>
.ctc-form {
  @apply bg-white p-6 rounded-lg shadow;
}

.travel-info-card {
  @apply bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200;
}

.section-title {
  @apply text-lg font-semibold mb-3 text-gray-800;
}

.info-item {
  @apply flex flex-col;
}

.info-label {
  @apply text-xs font-medium text-gray-600 mb-1;
}

.info-value {
  @apply text-sm text-gray-900;
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

.form-label-inline {
  @apply text-sm font-medium text-gray-700;
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

.form-checkbox {
  @apply rounded border-gray-300 text-blue-600 focus:ring-blue-500;
}

.form-hint {
  @apply block text-xs text-gray-500 mt-1;
}

.error-message {
  @apply block text-sm text-red-600 mt-1;
}

.itinerary-list {
  @apply space-y-3;
}

.itinerary-item {
  @apply border border-gray-200 p-3 rounded-md;
}

.btn-primary,
.btn-secondary,
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
