<template>
  <div class="user-management">
    <div class="user-management__header">
      <h2>Users</h2>
      <button type="button" class="btn btn--primary" @click="showCreateModal = true">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add User
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading users...</p>
    </div>

    <!-- Users Table -->
    <div v-else-if="users.length > 0" class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Employee No</th>
            <th>Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Position</th>
            <th>Roles</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.employeeNo }}</td>
            <td>{{ user.firstName }} {{ user.lastName }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.position || '-' }}</td>
            <td>
              <div class="roles">
                <span v-for="role in user.roles" :key="role" class="badge">
                  {{ formatRoleName(role) }}
                </span>
                <span v-if="!user.roles || user.roles.length === 0" class="text-muted">No roles</span>
              </div>
            </td>
            <td>
              <span :class="['status', user.isActive ? 'status--active' : 'status--inactive']">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button type="button" class="btn-icon" title="Edit" @click="editUser(user)">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="btn-icon btn-icon--danger"
                  title="Toggle Active Status"
                  @click="toggleUserStatus(user)"
                >
                  <svg v-if="user.isActive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="empty">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <p>No users found</p>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingUser" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal__header">
          <h3>{{ editingUser ? 'Edit User' : 'Create User' }}</h3>
          <button type="button" class="modal__close" @click="closeModal">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="modal__body">
          <form @submit.prevent="saveUser">
            <div class="form-grid">
              <div class="form-group">
                <label>Employee No *</label>
                <input
                  type="text"
                  v-model="formData.employeeNo"
                  required
                  :disabled="!!editingUser"
                />
              </div>

              <div class="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  v-model="formData.username"
                  required
                  :disabled="!!editingUser"
                />
              </div>

              <div class="form-group">
                <label>Email *</label>
                <input type="email" v-model="formData.email" required />
              </div>

              <div class="form-group">
                <label>First Name *</label>
                <input type="text" v-model="formData.firstName" required />
              </div>

              <div class="form-group">
                <label>Last Name *</label>
                <input type="text" v-model="formData.lastName" required />
              </div>

              <div class="form-group">
                <label>Middle Name</label>
                <input type="text" v-model="formData.middleName" />
              </div>

              <div class="form-group">
                <label>Position</label>
                <input type="text" v-model="formData.position" />
              </div>

              <div class="form-group">
                <label>Division/Office</label>
                <input type="text" v-model="formData.divisionOffice" />
              </div>

              <div v-if="!editingUser" class="form-group form-group--full">
                <label>Password *</label>
                <input
                  type="password"
                  v-model="formData.password"
                  :required="!editingUser"
                  minlength="8"
                />
                <small>Minimum 8 characters</small>
              </div>
            </div>

            <div class="form-group">
              <label>Roles</label>
              <div class="checkbox-group">
                <label v-for="role in availableRoles" :key="role.id" class="checkbox-label">
                  <input
                    type="checkbox"
                    :value="role.id"
                    v-model="formData.roleIds"
                  />
                  <span>{{ role.displayName }}</span>
                </label>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn--secondary" @click="closeModal">
                Cancel
              </button>
              <button type="submit" class="btn btn--primary" :disabled="saving">
                {{ saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface User {
  id: number;
  employeeNo: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  position: string | null;
  divisionOffice: string | null;
  isActive: boolean;
  roles: string[];
}

interface Role {
  id: number;
  name: string;
  displayName: string;
}

const users = ref<User[]>([]);
const availableRoles = ref<Role[]>([]);
const loading = ref(false);
const saving = ref(false);
const showCreateModal = ref(false);
const editingUser = ref<User | null>(null);

const formData = ref({
  employeeNo: '',
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  middleName: '',
  position: '',
  divisionOffice: '',
  password: '',
  roleIds: [] as number[],
});

async function loadUsers() {
  loading.value = true;
  try {
    const response = await fetch('/api/admin/users');
    if (!response.ok) throw new Error('Failed to load users');
    users.value = await response.json();
  } catch (error) {
    console.error('Error loading users:', error);
    alert('Failed to load users');
  } finally {
    loading.value = false;
  }
}

async function loadRoles() {
  try {
    const response = await fetch('/api/admin/roles');
    if (!response.ok) throw new Error('Failed to load roles');
    availableRoles.value = await response.json();
  } catch (error) {
    console.error('Error loading roles:', error);
  }
}

function editUser(user: User) {
  editingUser.value = user;
  formData.value = {
    employeeNo: user.employeeNo,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName || '',
    position: user.position || '',
    divisionOffice: user.divisionOffice || '',
    password: '',
    roleIds: [], // Will be loaded from API
  };

  // Load user's current roles
  loadUserRoles(user.id);
}

async function loadUserRoles(userId: number) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/roles`);
    if (response.ok) {
      const roles = await response.json();
      formData.value.roleIds = roles.map((r: any) => r.id);
    }
  } catch (error) {
    console.error('Error loading user roles:', error);
  }
}

async function saveUser() {
  saving.value = true;
  try {
    const url = editingUser.value
      ? `/api/admin/users/${editingUser.value.id}`
      : '/api/admin/users';

    const method = editingUser.value ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save user');
    }

    await loadUsers();
    closeModal();
    alert(editingUser.value ? 'User updated successfully' : 'User created successfully');
  } catch (error: any) {
    console.error('Error saving user:', error);
    alert(error.message || 'Failed to save user');
  } finally {
    saving.value = false;
  }
}

async function toggleUserStatus(user: User) {
  const action = user.isActive ? 'deactivate' : 'activate';
  if (!confirm(`Are you sure you want to ${action} ${user.firstName} ${user.lastName}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/users/${user.id}/toggle-status`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error(`Failed to ${action} user`);

    await loadUsers();
  } catch (error) {
    console.error(`Error toggling user status:`, error);
    alert(`Failed to ${action} user`);
  }
}

function closeModal() {
  showCreateModal.value = false;
  editingUser.value = null;
  formData.value = {
    employeeNo: '',
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    middleName: '',
    position: '',
    divisionOffice: '',
    password: '',
    roleIds: [],
  };
}

function formatRoleName(name: string): string {
  return name.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

onMounted(() => {
  loadUsers();
  loadRoles();
});
</script>

<style scoped>
.user-management__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.user-management__header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn svg {
  width: 1.25rem;
  height: 1.25rem;
}

.btn--primary {
  background-color: #3b82f6;
  color: white;
}

.btn--primary:hover {
  background-color: #2563eb;
}

.btn--secondary {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn--secondary:hover {
  background-color: #f9fafb;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Table */
.table-wrapper {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.table th {
  background-color: #f9fafb;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  color: #1f2937;
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: #dbeafe;
  color: #1e40af;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status--active {
  background-color: #d1fae5;
  color: #065f46;
}

.status--inactive {
  background-color: #fee2e2;
  color: #991b1b;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
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

.btn-icon:hover {
  background-color: #dbeafe;
}

.btn-icon--danger {
  color: #ef4444;
}

.btn-icon--danger:hover {
  background-color: #fee2e2;
}

.btn-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

/* Empty State */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #9ca3af;
}

.empty svg {
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
}

/* Modal */
.modal-overlay {
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

.modal {
  background-color: white;
  border-radius: 0.5rem;
  max-width: 48rem;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal__header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.modal__close {
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

.modal__close:hover {
  background-color: #f3f4f6;
}

.modal__close svg {
  width: 1.25rem;
  height: 1.25rem;
}

.modal__body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group--full {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px solid rgba(59, 130, 246, 0.5);
}

.form-group small {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.text-muted {
  color: #9ca3af;
  font-style: italic;
}
</style>
