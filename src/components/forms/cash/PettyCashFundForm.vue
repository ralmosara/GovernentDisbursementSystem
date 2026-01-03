<template>
  <div class="petty-cash-form">
    <div class="card">
      <form @submit.prevent="handleSubmit">
        <div class="form-section">
          <h3 class="section-title">Fund Information</h3>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label required">Fund Code</label>
              <input
                type="text"
                v-model="formData.fundCode"
                class="form-control"
                placeholder="e.g., PCF-2024-001"
                required
              />
              <small class="form-hint">Unique identifier for this petty cash fund</small>
            </div>

            <div class="form-group">
              <label class="form-label required">Fund Name</label>
              <input
                type="text"
                v-model="formData.fundName"
                class="form-control"
                placeholder="e.g., General Administration Petty Cash"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label required">Custodian</label>
              <input
                type="text"
                v-model="formData.custodian"
                class="form-control"
                placeholder="Name of the custodian"
                required
              />
              <small class="form-hint">Person responsible for managing this fund</small>
            </div>

            <div class="form-group">
              <label class="form-label required">Fund Cluster</label>
              <select v-model="formData.fundClusterId" class="form-control" required>
                <option value="">Select Fund Cluster</option>
                <option v-for="fc in fundClusters" :key="fc.id" :value="fc.id">
                  {{ fc.code }} - {{ fc.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label required">Fund Amount (₱)</label>
              <input
                type="number"
                v-model.number="formData.fundAmount"
                class="form-control"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
              <small class="form-hint">Initial petty cash fund amount</small>
            </div>

            <div class="form-group">
              <label class="form-label required">Replenishment Threshold (₱)</label>
              <input
                type="number"
                v-model.number="formData.replenishmentThreshold"
                class="form-control"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
              <small class="form-hint">Trigger replenishment when balance falls below this amount</small>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">Additional Details</h3>

          <div class="form-group">
            <label class="form-label">Remarks</label>
            <textarea
              v-model="formData.remarks"
              class="form-control"
              rows="3"
              placeholder="Optional remarks or notes about this fund"
            ></textarea>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <a href="/cash/petty-cash" class="btn btn-secondary">
            <i class="pi pi-times"></i>
            Cancel
          </a>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            <i class="pi pi-check"></i>
            {{ submitting ? 'Creating...' : 'Create Petty Cash Fund' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface FundCluster {
  id: number;
  code: string;
  name: string;
}

const formData = ref({
  fundCode: '',
  fundName: '',
  custodian: '',
  fundClusterId: '',
  fundAmount: 0,
  replenishmentThreshold: 0,
  remarks: '',
});

const fundClusters = ref<FundCluster[]>([]);
const submitting = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

async function loadFundClusters() {
  try {
    const response = await fetch('/api/budget/fund-clusters');
    if (response.ok) {
      fundClusters.value = await response.json();
    }
  } catch (error) {
    console.error('Error loading fund clusters:', error);
  }
}

async function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';
  submitting.value = true;

  try {
    const response = await fetch('/api/cash/petty-cash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fundCode: formData.value.fundCode,
        fundName: formData.value.fundName,
        custodian: formData.value.custodian,
        fundClusterId: parseInt(formData.value.fundClusterId as any),
        fundAmount: formData.value.fundAmount,
        replenishmentThreshold: formData.value.replenishmentThreshold,
        remarks: formData.value.remarks || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create petty cash fund');
    }

    successMessage.value = 'Petty cash fund created successfully!';

    // Redirect after 1.5 seconds
    setTimeout(() => {
      window.location.href = `/cash/petty-cash/${data.id}`;
    }, 1500);
  } catch (error: any) {
    errorMessage.value = error.message || 'An error occurred while creating the petty cash fund';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadFundClusters();
});
</script>

<style scoped>
.petty-cash-form {
  width: 100%;
}

.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.form-section {
  margin-bottom: 2rem;
}

.form-section:last-of-type {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-control {
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control::placeholder {
  color: #9ca3af;
}

.form-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.alert {
  padding: 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.alert-success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: white;
  color: #374151;
  border-color: #d1d5db;
}

.btn-secondary:hover {
  background-color: #f9fafb;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
