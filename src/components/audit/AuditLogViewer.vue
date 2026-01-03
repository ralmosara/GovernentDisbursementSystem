<template>
  <div class="audit-viewer">
    <!-- Filters -->
    <div class="audit-viewer__filters">
      <div class="audit-viewer__filters-row">
        <div class="audit-viewer__filter">
          <label class="audit-viewer__label">Action</label>
          <select v-model="filters.action" class="audit-viewer__select" @change="loadLogs">
            <option value="">All Actions</option>
            <option v-for="action in availableActions" :key="action" :value="action">
              {{ action }}
            </option>
          </select>
        </div>

        <div class="audit-viewer__filter">
          <label class="audit-viewer__label">Table</label>
          <select v-model="filters.tableName" class="audit-viewer__select" @change="loadLogs">
            <option value="">All Tables</option>
            <option v-for="table in availableTables" :key="table" :value="table">
              {{ formatTableName(table) }}
            </option>
          </select>
        </div>

        <div class="audit-viewer__filter">
          <label class="audit-viewer__label">Start Date</label>
          <input
            type="date"
            v-model="filters.startDate"
            class="audit-viewer__input"
            @change="loadLogs"
          />
        </div>

        <div class="audit-viewer__filter">
          <label class="audit-viewer__label">End Date</label>
          <input
            type="date"
            v-model="filters.endDate"
            class="audit-viewer__input"
            @change="loadLogs"
          />
        </div>

        <div class="audit-viewer__filter">
          <label class="audit-viewer__label">Record ID</label>
          <input
            type="number"
            v-model.number="filters.recordId"
            class="audit-viewer__input"
            placeholder="Enter ID..."
            @input="debouncedLoadLogs"
          />
        </div>
      </div>

      <div class="audit-viewer__filters-actions">
        <button type="button" class="audit-viewer__btn audit-viewer__btn--secondary" @click="clearFilters">
          Clear Filters
        </button>
        <button type="button" class="audit-viewer__btn audit-viewer__btn--primary" @click="exportLogs">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
        <button type="button" class="audit-viewer__btn audit-viewer__btn--primary" @click="loadStats">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          View Statistics
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="audit-viewer__loading">
      <div class="audit-viewer__spinner"></div>
      <p>Loading audit logs...</p>
    </div>

    <!-- Audit Logs Table -->
    <div v-else-if="logs.length > 0" class="audit-viewer__table-wrapper">
      <table class="audit-viewer__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date/Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Table</th>
            <th>Record ID</th>
            <th>IP Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ log.id }}</td>
            <td>{{ formatDateTime(log.createdAt) }}</td>
            <td>
              <div v-if="log.user" class="audit-viewer__user">
                <div class="audit-viewer__user-name">
                  {{ log.user.firstName }} {{ log.user.lastName }}
                </div>
                <div class="audit-viewer__user-username">@{{ log.user.username }}</div>
              </div>
              <span v-else class="audit-viewer__system">System</span>
            </td>
            <td>
              <span class="audit-viewer__badge" :class="`audit-viewer__badge--${getActionColor(log.action)}`">
                {{ log.action }}
              </span>
            </td>
            <td>{{ formatTableName(log.tableName) }}</td>
            <td>{{ log.recordId }}</td>
            <td>{{ log.ipAddress || '-' }}</td>
            <td>
              <button
                type="button"
                class="audit-viewer__action-btn"
                title="View Details"
                @click="viewDetails(log)"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="audit-viewer__pagination">
        <button
          type="button"
          class="audit-viewer__pagination-btn"
          :disabled="currentPage === 1"
          @click="previousPage"
        >
          Previous
        </button>
        <span class="audit-viewer__pagination-info">
          Page {{ currentPage }} ({{ logs.length }} records)
        </span>
        <button
          type="button"
          class="audit-viewer__pagination-btn"
          :disabled="logs.length < pageSize"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="audit-viewer__empty">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>No audit logs found</p>
    </div>

    <!-- Details Modal -->
    <div v-if="selectedLog" class="audit-viewer__modal-overlay" @click="closeDetails">
      <div class="audit-viewer__modal" @click.stop>
        <div class="audit-viewer__modal-header">
          <h3>Audit Log Details #{{ selectedLog.id }}</h3>
          <button type="button" class="audit-viewer__modal-close" @click="closeDetails">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="audit-viewer__modal-body">
          <div class="audit-viewer__detail-section">
            <h4>General Information</h4>
            <dl class="audit-viewer__detail-list">
              <dt>Action</dt>
              <dd>
                <span class="audit-viewer__badge" :class="`audit-viewer__badge--${getActionColor(selectedLog.action)}`">
                  {{ selectedLog.action }}
                </span>
              </dd>

              <dt>Date/Time</dt>
              <dd>{{ formatDateTime(selectedLog.createdAt) }}</dd>

              <dt>User</dt>
              <dd v-if="selectedLog.user">
                {{ selectedLog.user.firstName }} {{ selectedLog.user.lastName }}
                (@{{ selectedLog.user.username }})
              </dd>
              <dd v-else>System</dd>

              <dt>Table</dt>
              <dd>{{ formatTableName(selectedLog.tableName) }}</dd>

              <dt>Record ID</dt>
              <dd>{{ selectedLog.recordId }}</dd>

              <dt>IP Address</dt>
              <dd>{{ selectedLog.ipAddress || 'N/A' }}</dd>

              <dt>User Agent</dt>
              <dd class="audit-viewer__user-agent">{{ selectedLog.userAgent || 'N/A' }}</dd>
            </dl>
          </div>

          <div v-if="selectedLog.oldValues" class="audit-viewer__detail-section">
            <h4>Old Values</h4>
            <pre class="audit-viewer__json">{{ JSON.stringify(selectedLog.oldValues, null, 2) }}</pre>
          </div>

          <div v-if="selectedLog.newValues" class="audit-viewer__detail-section">
            <h4>New Values</h4>
            <pre class="audit-viewer__json">{{ JSON.stringify(selectedLog.newValues, null, 2) }}</pre>
          </div>

          <div v-if="selectedLog.oldValues && selectedLog.newValues" class="audit-viewer__detail-section">
            <h4>Changes Summary</h4>
            <table class="audit-viewer__changes-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Old Value</th>
                  <th>New Value</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="field in getChangedFields(selectedLog)" :key="field">
                  <td><strong>{{ field }}</strong></td>
                  <td class="audit-viewer__old-value">{{ formatValue(selectedLog.oldValues[field]) }}</td>
                  <td class="audit-viewer__new-value">{{ formatValue(selectedLog.newValues[field]) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="audit-viewer__modal-footer">
          <button type="button" class="audit-viewer__btn audit-viewer__btn--secondary" @click="closeDetails">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Statistics Modal -->
    <div v-if="showStats" class="audit-viewer__modal-overlay" @click="closeStats">
      <div class="audit-viewer__modal audit-viewer__modal--wide" @click.stop>
        <div class="audit-viewer__modal-header">
          <h3>Audit Log Statistics</h3>
          <button type="button" class="audit-viewer__modal-close" @click="closeStats">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="audit-viewer__modal-body">
          <div class="audit-viewer__stats-grid">
            <div class="audit-viewer__stat-card">
              <h4>Total Logs</h4>
              <p class="audit-viewer__stat-value">{{ stats?.totalLogs || 0 }}</p>
            </div>
          </div>

          <div class="audit-viewer__detail-section">
            <h4>By Action</h4>
            <table class="audit-viewer__stats-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(count, action) in stats?.byAction" :key="action">
                  <td>
                    <span class="audit-viewer__badge" :class="`audit-viewer__badge--${getActionColor(action as string)}`">
                      {{ action }}
                    </span>
                  </td>
                  <td>{{ count }}</td>
                  <td>{{ getPercentage(count as number, stats?.totalLogs || 0) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="audit-viewer__detail-section">
            <h4>By Table</h4>
            <table class="audit-viewer__stats-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(count, table) in stats?.byTable" :key="table">
                  <td>{{ formatTableName(table as string) }}</td>
                  <td>{{ count }}</td>
                  <td>{{ getPercentage(count as number, stats?.totalLogs || 0) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="audit-viewer__modal-footer">
          <button type="button" class="audit-viewer__btn audit-viewer__btn--secondary" @click="closeStats">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  tableName: string;
  recordId: number;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byTable: Record<string, number>;
  byUser: Record<string, number>;
}

const logs = ref<AuditLog[]>([]);
const selectedLog = ref<AuditLog | null>(null);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = 50;

const filters = ref({
  action: '',
  tableName: '',
  startDate: '',
  endDate: '',
  recordId: null as number | null,
});

const availableActions = ref<string[]>([]);
const availableTables = ref<string[]>([]);
const stats = ref<AuditStats | null>(null);
const showStats = ref(false);

let debounceTimeout: number | null = null;

async function loadLogs() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filters.value.action) params.append('action', filters.value.action);
    if (filters.value.tableName) params.append('tableName', filters.value.tableName);
    if (filters.value.startDate) params.append('startDate', filters.value.startDate);
    if (filters.value.endDate) params.append('endDate', filters.value.endDate);
    if (filters.value.recordId) params.append('recordId', filters.value.recordId.toString());
    params.append('limit', pageSize.toString());
    params.append('offset', ((currentPage.value - 1) * pageSize).toString());

    const response = await fetch(`/api/audit-logs?${params}`);
    if (!response.ok) throw new Error('Failed to load audit logs');

    logs.value = await response.json();
  } catch (error) {
    console.error('Error loading audit logs:', error);
    alert('Failed to load audit logs');
  } finally {
    loading.value = false;
  }
}

function debouncedLoadLogs() {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadLogs();
  }, 500) as unknown as number;
}

async function loadFilterOptions() {
  try {
    const [actionsRes, tablesRes] = await Promise.all([
      fetch('/api/audit-logs/actions'),
      fetch('/api/audit-logs/tables'),
    ]);

    if (actionsRes.ok) availableActions.value = await actionsRes.json();
    if (tablesRes.ok) availableTables.value = await tablesRes.json();
  } catch (error) {
    console.error('Error loading filter options:', error);
  }
}

async function loadStats() {
  try {
    const response = await fetch('/api/audit-logs/stats');
    if (!response.ok) throw new Error('Failed to load stats');

    stats.value = await response.json();
    showStats.value = true;
  } catch (error) {
    console.error('Error loading stats:', error);
    alert('Failed to load statistics');
  }
}

function clearFilters() {
  filters.value = {
    action: '',
    tableName: '',
    startDate: '',
    endDate: '',
    recordId: null,
  };
  currentPage.value = 1;
  loadLogs();
}

function exportLogs() {
  const params = new URLSearchParams();
  if (filters.value.action) params.append('action', filters.value.action);
  if (filters.value.tableName) params.append('tableName', filters.value.tableName);
  if (filters.value.startDate) params.append('startDate', filters.value.startDate);
  if (filters.value.endDate) params.append('endDate', filters.value.endDate);

  window.open(`/api/audit-logs/export?${params}`, '_blank');
}

function viewDetails(log: AuditLog) {
  selectedLog.value = log;
}

function closeDetails() {
  selectedLog.value = null;
}

function closeStats() {
  showStats.value = false;
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadLogs();
  }
}

function nextPage() {
  currentPage.value++;
  loadLogs();
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTableName(table: string): string {
  return table
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    APPROVE: 'green',
    REJECT: 'red',
    CANCEL: 'gray',
    SUBMIT: 'blue',
    PROCESS: 'purple',
    LOGIN: 'green',
    LOGOUT: 'gray',
  };
  return colors[action] || 'gray';
}

function getChangedFields(log: AuditLog): string[] {
  if (!log.oldValues || !log.newValues) return [];

  const allKeys = new Set([
    ...Object.keys(log.oldValues),
    ...Object.keys(log.newValues),
  ]);

  return Array.from(allKeys).filter(
    key => log.oldValues[key] !== log.newValues[key]
  );
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getPercentage(count: number, total: number): string {
  if (total === 0) return '0.00';
  return ((count / total) * 100).toFixed(2);
}

onMounted(() => {
  loadLogs();
  loadFilterOptions();
});
</script>

<style scoped>
.audit-viewer {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

/* Filters */
.audit-viewer__filters {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.audit-viewer__filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.audit-viewer__filter {
  display: flex;
  flex-direction: column;
}

.audit-viewer__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.audit-viewer__select,
.audit-viewer__input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.audit-viewer__select:focus,
.audit-viewer__input:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px solid rgba(59, 130, 246, 0.5);
}

.audit-viewer__filters-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.audit-viewer__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.audit-viewer__btn svg {
  width: 1.25rem;
  height: 1.25rem;
}

.audit-viewer__btn--primary {
  background-color: #3b82f6;
  color: white;
}

.audit-viewer__btn--primary:hover {
  background-color: #2563eb;
}

.audit-viewer__btn--secondary {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.audit-viewer__btn--secondary:hover {
  background-color: #f9fafb;
}

/* Loading */
.audit-viewer__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.audit-viewer__spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Table */
.audit-viewer__table-wrapper {
  overflow-x: auto;
}

.audit-viewer__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.audit-viewer__table th {
  background-color: #f9fafb;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.audit-viewer__table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #1f2937;
}

.audit-viewer__user {
  display: flex;
  flex-direction: column;
}

.audit-viewer__user-name {
  font-weight: 500;
}

.audit-viewer__user-username {
  font-size: 0.75rem;
  color: #6b7280;
}

.audit-viewer__system {
  color: #9ca3af;
  font-style: italic;
}

.audit-viewer__badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.audit-viewer__badge--green {
  background-color: #d1fae5;
  color: #065f46;
}

.audit-viewer__badge--blue {
  background-color: #dbeafe;
  color: #1e40af;
}

.audit-viewer__badge--red {
  background-color: #fee2e2;
  color: #991b1b;
}

.audit-viewer__badge--purple {
  background-color: #e9d5ff;
  color: #6b21a8;
}

.audit-viewer__badge--gray {
  background-color: #f3f4f6;
  color: #4b5563;
}

.audit-viewer__action-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: transparent;
  color: #3b82f6;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.audit-viewer__action-btn:hover {
  background-color: #dbeafe;
}

.audit-viewer__action-btn svg {
  width: 1.25rem;
  height: 1.25rem;
}

/* Pagination */
.audit-viewer__pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.audit-viewer__pagination-btn {
  padding: 0.5rem 1rem;
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.audit-viewer__pagination-btn:hover:not(:disabled) {
  background-color: #f9fafb;
}

.audit-viewer__pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.audit-viewer__pagination-info {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Empty State */
.audit-viewer__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #9ca3af;
}

.audit-viewer__empty svg {
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
}

/* Modal */
.audit-viewer__modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.audit-viewer__modal {
  background-color: white;
  border-radius: 0.5rem;
  max-width: 48rem;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.audit-viewer__modal--wide {
  max-width: 64rem;
}

.audit-viewer__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.audit-viewer__modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.audit-viewer__modal-close {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.audit-viewer__modal-close:hover {
  background-color: #f3f4f6;
}

.audit-viewer__modal-close svg {
  width: 1.25rem;
  height: 1.25rem;
}

.audit-viewer__modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.audit-viewer__detail-section {
  margin-bottom: 2rem;
}

.audit-viewer__detail-section:last-child {
  margin-bottom: 0;
}

.audit-viewer__detail-section h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.audit-viewer__detail-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem 1.5rem;
}

.audit-viewer__detail-list dt {
  font-weight: 500;
  color: #6b7280;
}

.audit-viewer__detail-list dd {
  color: #1f2937;
}

.audit-viewer__user-agent {
  word-break: break-all;
  font-size: 0.75rem;
  color: #6b7280;
}

.audit-viewer__json {
  background-color: #f9fafb;
  padding: 1rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  font-size: 0.875rem;
  color: #1f2937;
  font-family: 'Courier New', monospace;
}

.audit-viewer__changes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.audit-viewer__changes-table th {
  background-color: #f9fafb;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.audit-viewer__changes-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.audit-viewer__old-value {
  color: #ef4444;
  background-color: #fee2e2;
}

.audit-viewer__new-value {
  color: #10b981;
  background-color: #d1fae5;
}

.audit-viewer__modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

/* Statistics */
.audit-viewer__stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.audit-viewer__stat-card {
  background-color: #f9fafb;
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.audit-viewer__stat-card h4 {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.audit-viewer__stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
}

.audit-viewer__stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.audit-viewer__stats-table th {
  background-color: #f9fafb;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.audit-viewer__stats-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #1f2937;
}
</style>
