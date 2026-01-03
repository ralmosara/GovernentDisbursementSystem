<template>
  <div class="activity-dashboard">
    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon bg-blue-100 text-blue-600">
          <i class="pi pi-clock"></i>
        </div>
        <div class="stat-content">
          <p class="stat-label">Today</p>
          <p class="stat-value">{{ stats.today }}</p>
          <p class="stat-change">{{ stats.todayChange > 0 ? '+' : '' }}{{ stats.todayChange }}% from yesterday</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bg-green-100 text-green-600">
          <i class="pi pi-calendar"></i>
        </div>
        <div class="stat-content">
          <p class="stat-label">This Week</p>
          <p class="stat-value">{{ stats.week }}</p>
          <p class="stat-change">{{ stats.weekChange > 0 ? '+' : '' }}{{ stats.weekChange }}% from last week</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bg-purple-100 text-purple-600">
          <i class="pi pi-chart-bar"></i>
        </div>
        <div class="stat-content">
          <p class="stat-label">This Month</p>
          <p class="stat-value">{{ stats.month }}</p>
          <p class="stat-change">{{ stats.monthChange > 0 ? '+' : '' }}{{ stats.monthChange }}% from last month</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon bg-orange-100 text-orange-600">
          <i class="pi pi-users"></i>
        </div>
        <div class="stat-content">
          <p class="stat-label">Active Users</p>
          <p class="stat-value">{{ stats.activeUsers }}</p>
          <p class="stat-change">In last 24 hours</p>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid">
      <!-- Recent Activity Feed -->
      <div class="card activity-feed">
        <div class="card-header">
          <h3 class="card-title">Recent Activity</h3>
          <div class="card-actions">
            <select v-model="activityLimit" @change="loadRecentActivity" class="form-control-sm">
              <option :value="50">Last 50</option>
              <option :value="100">Last 100</option>
              <option :value="200">Last 200</option>
            </select>
          </div>
        </div>
        <div class="card-body">
          <div v-if="loading" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
            <p>Loading activities...</p>
          </div>

          <div v-else-if="recentActivities.length === 0" class="empty-state">
            <i class="pi pi-inbox"></i>
            <p>No recent activities</p>
          </div>

          <div v-else class="activity-list">
            <div
              v-for="activity in recentActivities"
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-icon" :class="`action-${activity.action.toLowerCase()}`">
                <i :class="getActionIcon(activity.action)"></i>
              </div>
              <div class="activity-content">
                <p class="activity-text">
                  <strong>{{ activity.user?.username || 'System' }}</strong>
                  <span class="action-badge" :class="`badge-${getActionColor(activity.action)}`">
                    {{ activity.action }}
                  </span>
                  <span class="activity-table">{{ formatTableName(activity.tableName) }}</span>
                  <span v-if="activity.recordId" class="activity-record">#{{ activity.recordId }}</span>
                </p>
                <p class="activity-meta">
                  <i class="pi pi-clock"></i>
                  {{ formatDateTime(activity.createdAt) }}
                  <span v-if="activity.ipAddress">
                    <i class="pi pi-globe"></i>
                    {{ activity.ipAddress }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Users -->
      <div class="card top-users">
        <div class="card-header">
          <h3 class="card-title">Most Active Users</h3>
        </div>
        <div class="card-body">
          <div v-if="loadingUsers" class="loading-state">
            <i class="pi pi-spin pi-spinner"></i>
          </div>

          <div v-else-if="topUsers.length === 0" class="empty-state">
            <p>No user activity data</p>
          </div>

          <div v-else class="user-list">
            <div
              v-for="(userStat, index) in topUsers"
              :key="userStat.user"
              class="user-item"
            >
              <div class="user-rank">{{ index + 1 }}</div>
              <div class="user-info">
                <p class="user-name">{{ userStat.user || 'Unknown User' }}</p>
                <p class="user-actions">{{ userStat.count }} actions</p>
              </div>
              <div class="user-bar">
                <div
                  class="user-bar-fill"
                  :style="{ width: `${(userStat.count / topUsers[0].count) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity by Action Type -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Activity Breakdown by Action</h3>
      </div>
      <div class="card-body">
        <div v-if="loadingStats" class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else class="action-breakdown">
          <div
            v-for="action in actionStats"
            :key="action.action"
            class="action-stat"
          >
            <div class="action-header">
              <span class="action-badge" :class="`badge-${getActionColor(action.action)}`">
                {{ action.action }}
              </span>
              <span class="action-count">{{ action.count }}</span>
            </div>
            <div class="action-bar">
              <div
                class="action-bar-fill"
                :class="`bg-${getActionColor(action.action)}`"
                :style="{ width: `${action.percentage}%` }"
              ></div>
            </div>
            <p class="action-percentage">{{ action.percentage }}% of total</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity by Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Activity Breakdown by Module</h3>
      </div>
      <div class="card-body">
        <div v-if="loadingStats" class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
        </div>

        <div v-else class="table-breakdown">
          <div
            v-for="table in tableStats"
            :key="table.tableName"
            class="table-stat"
          >
            <div class="table-header">
              <span class="table-name">{{ formatTableName(table.tableName) }}</span>
              <span class="table-count">{{ table.count }}</span>
            </div>
            <div class="table-bar">
              <div
                class="table-bar-fill"
                :style="{ width: `${table.percentage}%` }"
              ></div>
            </div>
            <p class="table-percentage">{{ table.percentage }}% of total</p>
          </div>
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
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Stats {
  today: number;
  todayChange: number;
  week: number;
  weekChange: number;
  month: number;
  monthChange: number;
  activeUsers: number;
}

interface UserStat {
  user: string;
  count: number;
}

interface ActionStat {
  action: string;
  count: number;
  percentage: number;
}

interface TableStat {
  tableName: string;
  count: number;
  percentage: number;
}

const loading = ref(true);
const loadingUsers = ref(true);
const loadingStats = ref(true);
const activityLimit = ref(50);
const recentActivities = ref<AuditLog[]>([]);
const topUsers = ref<UserStat[]>([]);
const actionStats = ref<ActionStat[]>([]);
const tableStats = ref<TableStat[]>([]);
const stats = ref<Stats>({
  today: 0,
  todayChange: 0,
  week: 0,
  weekChange: 0,
  month: 0,
  monthChange: 0,
  activeUsers: 0,
});

const getActionIcon = (action: string): string => {
  const iconMap: Record<string, string> = {
    CREATE: 'pi pi-plus-circle',
    UPDATE: 'pi pi-pencil',
    DELETE: 'pi pi-trash',
    APPROVE: 'pi pi-check-circle',
    REJECT: 'pi pi-times-circle',
    SUBMIT: 'pi pi-send',
    CANCEL: 'pi pi-ban',
    PROCESS: 'pi pi-cog',
    LOGIN: 'pi pi-sign-in',
    LOGOUT: 'pi pi-sign-out',
  };
  return iconMap[action] || 'pi pi-circle';
};

const getActionColor = (action: string): string => {
  const colorMap: Record<string, string> = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'danger',
    APPROVE: 'success',
    REJECT: 'danger',
    SUBMIT: 'primary',
    CANCEL: 'warning',
    PROCESS: 'purple',
    LOGIN: 'info',
    LOGOUT: 'secondary',
  };
  return colorMap[action] || 'secondary';
};

const formatTableName = (tableName: string): string => {
  return tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatDateTime = (date: Date): string => {
  const now = new Date();
  const activityDate = new Date(date);
  const diffMs = now.getTime() - activityDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const loadRecentActivity = async () => {
  loading.value = true;
  try {
    const response = await fetch(`/api/audit-logs?limit=${activityLimit.value}`);
    const data = await response.json();
    recentActivities.value = data.logs || [];
  } catch (error) {
    console.error('Error loading recent activity:', error);
  } finally {
    loading.value = false;
  }
};

const loadQuickStats = async () => {
  try {
    // Get stats for different time periods
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);

    const monthStart = new Date(today);
    monthStart.setDate(monthStart.getDate() - 30);

    const lastMonthStart = new Date(today);
    lastMonthStart.setDate(lastMonthStart.getDate() - 60);

    // Fetch all data in parallel
    const [todayData, yesterdayData, weekData, lastWeekData, monthData, lastMonthData] = await Promise.all([
      fetch(`/api/audit-logs?startDate=${today.toISOString().split('T')[0]}`).then(r => r.json()),
      fetch(`/api/audit-logs?startDate=${yesterday.toISOString().split('T')[0]}&endDate=${today.toISOString().split('T')[0]}`).then(r => r.json()),
      fetch(`/api/audit-logs?startDate=${weekStart.toISOString().split('T')[0]}`).then(r => r.json()),
      fetch(`/api/audit-logs?startDate=${lastWeekStart.toISOString().split('T')[0]}&endDate=${weekStart.toISOString().split('T')[0]}`).then(r => r.json()),
      fetch(`/api/audit-logs?startDate=${monthStart.toISOString().split('T')[0]}`).then(r => r.json()),
      fetch(`/api/audit-logs?startDate=${lastMonthStart.toISOString().split('T')[0]}&endDate=${monthStart.toISOString().split('T')[0]}`).then(r => r.json()),
    ]);

    const todayCount = todayData.logs?.length || 0;
    const yesterdayCount = yesterdayData.logs?.length || 0;
    const weekCount = weekData.logs?.length || 0;
    const lastWeekCount = lastWeekData.logs?.length || 0;
    const monthCount = monthData.logs?.length || 0;
    const lastMonthCount = lastMonthData.logs?.length || 0;

    // Calculate changes
    stats.value = {
      today: todayCount,
      todayChange: yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0,
      week: weekCount,
      weekChange: lastWeekCount > 0 ? Math.round(((weekCount - lastWeekCount) / lastWeekCount) * 100) : 0,
      month: monthCount,
      monthChange: lastMonthCount > 0 ? Math.round(((monthCount - lastMonthCount) / lastMonthCount) * 100) : 0,
      activeUsers: new Set(weekData.logs?.map((l: any) => l.userId).filter(Boolean)).size,
    };
  } catch (error) {
    console.error('Error loading quick stats:', error);
  }
};

const loadTopUsers = async () => {
  loadingUsers.value = true;
  try {
    const response = await fetch('/api/audit-logs/stats');
    const data = await response.json();
    topUsers.value = (data.byUser || []).slice(0, 10);
  } catch (error) {
    console.error('Error loading top users:', error);
  } finally {
    loadingUsers.value = false;
  }
};

const loadActivityStats = async () => {
  loadingStats.value = true;
  try {
    const response = await fetch('/api/audit-logs/stats');
    const data = await response.json();

    actionStats.value = data.byAction || [];
    tableStats.value = data.byTable || [];
  } catch (error) {
    console.error('Error loading activity stats:', error);
  } finally {
    loadingStats.value = false;
  }
};

onMounted(() => {
  loadRecentActivity();
  loadQuickStats();
  loadTopUsers();
  loadActivityStats();
});
</script>

<style scoped>
.activity-dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

.stat-change {
  font-size: 0.75rem;
  color: #6b7280;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.form-control-sm {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.card-body {
  padding: 1.5rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.loading-state i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #d1d5db;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 600px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.375rem;
  background-color: #f9fafb;
  transition: background-color 0.15s;
}

.activity-item:hover {
  background-color: #f3f4f6;
}

.activity-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-create { background-color: #d1fae5; color: #065f46; }
.action-update { background-color: #dbeafe; color: #1e40af; }
.action-delete { background-color: #fee2e2; color: #991b1b; }
.action-approve { background-color: #d1fae5; color: #065f46; }
.action-reject { background-color: #fee2e2; color: #991b1b; }
.action-submit { background-color: #dbeafe; color: #1e40af; }
.action-cancel { background-color: #fef3c7; color: #92400e; }
.action-process { background-color: #e0e7ff; color: #3730a3; }

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 0.875rem;
  color: #1f2937;
  margin-bottom: 0.25rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.action-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 0.25rem;
}

.badge-success { background-color: #d1fae5; color: #065f46; }
.badge-info { background-color: #dbeafe; color: #1e40af; }
.badge-danger { background-color: #fee2e2; color: #991b1b; }
.badge-warning { background-color: #fef3c7; color: #92400e; }
.badge-primary { background-color: #dbeafe; color: #1e40af; }
.badge-purple { background-color: #e0e7ff; color: #3730a3; }
.badge-secondary { background-color: #e5e7eb; color: #374151; }

.activity-table {
  color: #6b7280;
  font-size: 0.8125rem;
}

.activity-record {
  font-family: 'Courier New', monospace;
  color: #6b7280;
  font-size: 0.8125rem;
}

.activity-meta {
  font-size: 0.75rem;
  color: #9ca3af;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.activity-meta i {
  margin-right: 0.25rem;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-item {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.user-rank {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 0.125rem;
}

.user-actions {
  font-size: 0.75rem;
  color: #6b7280;
}

.user-bar {
  flex: 2;
  height: 0.5rem;
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  overflow: hidden;
}

.user-bar-fill {
  height: 100%;
  background-color: #3b82f6;
  transition: width 0.3s;
}

.action-breakdown,
.table-breakdown {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.action-stat,
.table-stat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-header,
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-count,
.table-count {
  font-weight: 600;
  color: #1f2937;
}

.table-name {
  font-weight: 500;
  color: #1f2937;
}

.action-bar,
.table-bar {
  height: 0.75rem;
  background-color: #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
}

.action-bar-fill,
.table-bar-fill {
  height: 100%;
  transition: width 0.3s;
}

.bg-success { background-color: #10b981; }
.bg-info { background-color: #3b82f6; }
.bg-danger { background-color: #ef4444; }
.bg-warning { background-color: #f59e0b; }
.bg-primary { background-color: #3b82f6; }
.bg-purple { background-color: #8b5cf6; }
.bg-secondary { background-color: #6b7280; }

.table-bar-fill {
  background-color: #3b82f6;
}

.action-percentage,
.table-percentage {
  font-size: 0.75rem;
  color: #6b7280;
}

.bg-blue-100 { background-color: #dbeafe; }
.text-blue-600 { color: #2563eb; }
.bg-green-100 { background-color: #d1fae5; }
.text-green-600 { color: #059669; }
.bg-purple-100 { background-color: #e0e7ff; }
.text-purple-600 { color: #7c3aed; }
.bg-orange-100 { background-color: #ffedd5; }
.text-orange-600 { color: #ea580c; }

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}
</style>
