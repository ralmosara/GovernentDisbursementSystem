<template>
  <div class="file-upload">
    <h3 class="file-upload__title">Attachments</h3>

    <!-- Upload Area (hidden if readonly) -->
    <div v-if="!readonly" class="file-upload__dropzone-wrapper">
      <div
        class="file-upload__dropzone"
        :class="{ 'file-upload__dropzone--dragging': isDragging }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <div class="file-upload__dropzone-content">
          <svg class="file-upload__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="file-upload__text">Drag and drop files here, or</p>
          <button type="button" class="file-upload__browse-btn" @click="triggerFileInput">
            Browse Files
          </button>
          <p class="file-upload__hint">
            Max {{ maxFiles }} files, 10MB each. Allowed: PDF, JPEG, PNG, XLSX, DOCX
          </p>
        </div>
        <input
          ref="fileInput"
          type="file"
          multiple
          :accept="acceptedFileTypes"
          class="file-upload__input"
          @change="handleFileSelect"
        />
      </div>
    </div>

    <!-- Upload Queue (files being uploaded) -->
    <div v-if="uploadQueue.length > 0" class="file-upload__queue">
      <h4 class="file-upload__queue-title">Uploading...</h4>
      <div v-for="item in uploadQueue" :key="item.id" class="file-upload__queue-item">
        <div class="file-upload__queue-info">
          <p class="file-upload__queue-name">{{ item.file.name }}</p>
          <p class="file-upload__queue-size">{{ formatFileSize(item.file.size) }}</p>
        </div>
        <div class="file-upload__queue-progress">
          <div class="file-upload__progress-bar">
            <div
              class="file-upload__progress-fill"
              :style="{ width: `${item.progress}%` }"
            ></div>
          </div>
          <span class="file-upload__progress-text">{{ item.progress }}%</span>
        </div>
      </div>
    </div>

    <!-- Uploaded Files List -->
    <div v-if="attachments.length > 0" class="file-upload__list">
      <div v-for="attachment in attachments" :key="attachment.id" class="file-upload__item">
        <div class="file-upload__item-preview">
          <img
            v-if="isImage(attachment.fileType)"
            :src="`/uploads/${attachment.filePath}`"
            :alt="attachment.fileOriginalName"
            class="file-upload__thumbnail"
          />
          <div v-else class="file-upload__file-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span class="file-upload__extension">{{ attachment.fileExtension }}</span>
          </div>
        </div>

        <div class="file-upload__item-details">
          <p class="file-upload__item-name">{{ attachment.fileOriginalName }}</p>
          <p class="file-upload__item-meta">
            {{ formatFileSize(attachment.fileSize) }}
            <span v-if="attachment.documentType"> • {{ attachment.documentType }}</span>
          </p>
          <p v-if="attachment.description" class="file-upload__item-description">
            {{ attachment.description }}
          </p>
          <p class="file-upload__item-uploaded">
            Uploaded by {{ attachment.uploaderName }} on {{ formatDate(attachment.uploadedAt) }}
          </p>
        </div>

        <div class="file-upload__item-actions">
          <a
            :href="`/api/attachments/${attachment.id}/download`"
            class="file-upload__action-btn file-upload__action-btn--download"
            title="Download"
            download
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
          <button
            v-if="!readonly && canDelete(attachment)"
            type="button"
            class="file-upload__action-btn file-upload__action-btn--delete"
            title="Delete"
            @click="deleteAttachment(attachment.id)"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="attachments.length === 0 && readonly" class="file-upload__empty">
      <p>No attachments</p>
    </div>

    <!-- Upload Form Modal -->
    <div v-if="showUploadForm" class="file-upload__modal-overlay" @click="cancelUpload">
      <div class="file-upload__modal" @click.stop>
        <div class="file-upload__modal-header">
          <h4>Upload Files ({{ pendingFiles.length }})</h4>
          <button type="button" class="file-upload__modal-close" @click="cancelUpload">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="file-upload__modal-body">
          <div v-for="(file, index) in pendingFiles" :key="index" class="file-upload__form-item">
            <div class="file-upload__form-preview">
              <img
                v-if="isImageFile(file)"
                :src="getFilePreview(file)"
                :alt="file.name"
                class="file-upload__form-thumbnail"
              />
              <div v-else class="file-upload__form-icon">
                <span>{{ getFileExtension(file.name) }}</span>
              </div>
            </div>

            <div class="file-upload__form-fields">
              <p class="file-upload__form-filename">{{ file.name }}</p>
              <p class="file-upload__form-filesize">{{ formatFileSize(file.size) }}</p>

              <div class="file-upload__form-row">
                <label class="file-upload__form-label">
                  Document Type
                  <select v-model="fileMetadata[index].documentType" class="file-upload__form-select">
                    <option value="">Select type...</option>
                    <option v-for="type in documentTypes" :key="type" :value="type">
                      {{ type }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="file-upload__form-row">
                <label class="file-upload__form-label">
                  Description (optional)
                  <textarea
                    v-model="fileMetadata[index].description"
                    class="file-upload__form-textarea"
                    rows="2"
                    placeholder="Enter description..."
                  ></textarea>
                </label>
              </div>
            </div>

            <button
              type="button"
              class="file-upload__form-remove"
              title="Remove"
              @click="removePendingFile(index)"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="file-upload__modal-footer">
          <button type="button" class="file-upload__modal-btn file-upload__modal-btn--cancel" @click="cancelUpload">
            Cancel
          </button>
          <button
            type="button"
            class="file-upload__modal-btn file-upload__modal-btn--upload"
            :disabled="uploading"
            @click="uploadFiles"
          >
            {{ uploading ? 'Uploading...' : `Upload ${pendingFiles.length} file(s)` }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';

interface Attachment {
  id: number;
  attachableType: string;
  attachableId: number;
  fileName: string;
  fileOriginalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  fileExtension: string;
  documentType: string | null;
  description: string | null;
  uploadedBy: number;
  uploaderName: string;
  uploadedAt: Date;
}

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
}

interface FileMetadata {
  documentType: string;
  description: string;
}

interface Props {
  attachableType: string;
  attachableId: number;
  maxFiles?: number;
  documentTypes?: string[];
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxFiles: 5,
  documentTypes: () => ['Invoice', 'Receipt', 'Contract', 'Report', 'Other'],
  readonly: false,
});

const emit = defineEmits<{
  uploaded: [];
  deleted: [id: number];
}>();

// State
const attachments = ref<Attachment[]>([]);
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const pendingFiles = ref<File[]>([]);
const fileMetadata = reactive<FileMetadata[]>([]);
const showUploadForm = ref(false);
const uploading = ref(false);
const uploadQueue = ref<UploadQueueItem[]>([]);

// Constants
const acceptedFileTypes = '.pdf,.jpg,.jpeg,.png,.xlsx,.docx';
const maxFileSize = 10 * 1024 * 1024; // 10MB

// Computed
const currentUser = computed(() => {
  // Get from session/store (placeholder)
  return { id: 1 };
});

// Methods
function triggerFileInput() {
  fileInput.value?.click();
}

function handleDragOver() {
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(e: DragEvent) {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  processFiles(files);
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  processFiles(files);
  target.value = ''; // Reset input
}

function processFiles(files: File[]) {
  // Validate file count
  if (attachments.value.length + pendingFiles.value.length + files.length > props.maxFiles) {
    alert(`Maximum ${props.maxFiles} files allowed`);
    return;
  }

  // Validate each file
  const validFiles: File[] = [];
  for (const file of files) {
    if (file.size > maxFileSize) {
      alert(`File ${file.name} exceeds 10MB limit`);
      continue;
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(extension)) {
      alert(`File ${file.name} has invalid type. Allowed: PDF, JPEG, PNG, XLSX, DOCX`);
      continue;
    }

    validFiles.push(file);
  }

  // Add to pending files
  pendingFiles.value.push(...validFiles);
  validFiles.forEach(() => {
    fileMetadata.push({ documentType: '', description: '' });
  });

  // Show upload form
  if (validFiles.length > 0) {
    showUploadForm.value = true;
  }
}

function removePendingFile(index: number) {
  pendingFiles.value.splice(index, 1);
  fileMetadata.splice(index, 1);

  if (pendingFiles.value.length === 0) {
    showUploadForm.value = false;
  }
}

function cancelUpload() {
  if (!uploading.value) {
    pendingFiles.value = [];
    fileMetadata.splice(0);
    showUploadForm.value = false;
  }
}

async function uploadFiles() {
  uploading.value = true;

  for (let i = 0; i < pendingFiles.value.length; i++) {
    const file = pendingFiles.value[i];
    const metadata = fileMetadata[i];

    // Add to upload queue
    const queueItem: UploadQueueItem = {
      id: `${Date.now()}-${i}`,
      file,
      progress: 0,
    };
    uploadQueue.value.push(queueItem);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('attachableType', props.attachableType);
      formData.append('attachableId', props.attachableId.toString());
      if (metadata.documentType) {
        formData.append('documentType', metadata.documentType);
      }
      if (metadata.description) {
        formData.append('description', metadata.description);
      }

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          queueItem.progress = Math.round((e.loaded / e.total) * 100);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 201) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('POST', '/api/attachments');
        xhr.send(formData);
      });

      // Remove from queue
      uploadQueue.value = uploadQueue.value.filter(item => item.id !== queueItem.id);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload ${file.name}`);
      uploadQueue.value = uploadQueue.value.filter(item => item.id !== queueItem.id);
    }
  }

  // Clear pending files and reload
  pendingFiles.value = [];
  fileMetadata.splice(0);
  showUploadForm.value = false;
  uploading.value = false;

  // Reload attachments
  await loadAttachments();
  emit('uploaded');
}

async function deleteAttachment(id: number) {
  if (!confirm('Are you sure you want to delete this attachment?')) {
    return;
  }

  try {
    const response = await fetch(`/api/attachments/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete attachment');
    }

    // Remove from list
    attachments.value = attachments.value.filter(a => a.id !== id);
    emit('deleted', id);
  } catch (error) {
    console.error('Delete error:', error);
    alert('Failed to delete attachment');
  }
}

async function loadAttachments() {
  try {
    const response = await fetch(
      `/api/attachments?attachableType=${props.attachableType}&attachableId=${props.attachableId}`
    );

    if (!response.ok) {
      throw new Error('Failed to load attachments');
    }

    attachments.value = await response.json();
  } catch (error) {
    console.error('Load error:', error);
  }
}

function canDelete(attachment: Attachment): boolean {
  // User can delete their own uploads or admin can delete all
  return attachment.uploadedBy === currentUser.value.id;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toUpperCase() || '';
}

function getFilePreview(file: File): string {
  return URL.createObjectURL(file);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Lifecycle
onMounted(() => {
  loadAttachments();
});
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.file-upload__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1f2937;
}

/* Dropzone */
.file-upload__dropzone-wrapper {
  margin-bottom: 1.5rem;
}

.file-upload__dropzone {
  border: 2px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  background-color: #f9fafb;
  transition: all 0.2s;
  cursor: pointer;
}

.file-upload__dropzone:hover {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.file-upload__dropzone--dragging {
  border-color: #3b82f6;
  background-color: #dbeafe;
}

.file-upload__dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.file-upload__icon {
  width: 3rem;
  height: 3rem;
  color: #9ca3af;
}

.file-upload__text {
  color: #6b7280;
  font-size: 0.875rem;
}

.file-upload__browse-btn {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-upload__browse-btn:hover {
  background-color: #2563eb;
}

.file-upload__hint {
  color: #9ca3af;
  font-size: 0.75rem;
}

.file-upload__input {
  display: none;
}

/* Upload Queue */
.file-upload__queue {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
}

.file-upload__queue-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #4b5563;
}

.file-upload__queue-item {
  background-color: white;
  padding: 0.75rem;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
}

.file-upload__queue-item:last-child {
  margin-bottom: 0;
}

.file-upload__queue-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.file-upload__queue-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.file-upload__queue-size {
  font-size: 0.75rem;
  color: #6b7280;
}

.file-upload__queue-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-upload__progress-bar {
  flex: 1;
  height: 0.5rem;
  background-color: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.file-upload__progress-fill {
  height: 100%;
  background-color: #3b82f6;
  transition: width 0.3s;
}

.file-upload__progress-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  min-width: 3rem;
  text-align: right;
}

/* Attachments List */
.file-upload__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-upload__item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.file-upload__item-preview {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
}

.file-upload__thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.375rem;
}

.file-upload__file-icon {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #e5e7eb;
  border-radius: 0.375rem;
}

.file-upload__file-icon svg {
  width: 2rem;
  height: 2rem;
  color: #6b7280;
}

.file-upload__extension {
  font-size: 0.625rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin-top: 0.25rem;
}

.file-upload__item-details {
  flex: 1;
  min-width: 0;
}

.file-upload__item-name {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-upload__item-meta {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.file-upload__item-description {
  font-size: 0.875rem;
  color: #4b5563;
  margin-bottom: 0.25rem;
}

.file-upload__item-uploaded {
  font-size: 0.75rem;
  color: #9ca3af;
}

.file-upload__item-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.file-upload__action-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: transparent;
}

.file-upload__action-btn svg {
  width: 1.25rem;
  height: 1.25rem;
}

.file-upload__action-btn--download {
  color: #3b82f6;
}

.file-upload__action-btn--download:hover {
  background-color: #dbeafe;
}

.file-upload__action-btn--delete {
  color: #ef4444;
}

.file-upload__action-btn--delete:hover {
  background-color: #fee2e2;
}

/* Empty State */
.file-upload__empty {
  padding: 2rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
}

/* Modal */
.file-upload__modal-overlay {
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

.file-upload__modal {
  background-color: white;
  border-radius: 0.5rem;
  max-width: 48rem;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.file-upload__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.file-upload__modal-header h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.file-upload__modal-close {
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

.file-upload__modal-close:hover {
  background-color: #f3f4f6;
}

.file-upload__modal-close svg {
  width: 1.25rem;
  height: 1.25rem;
}

.file-upload__modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.file-upload__form-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  position: relative;
}

.file-upload__form-item:last-child {
  margin-bottom: 0;
}

.file-upload__form-preview {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
}

.file-upload__form-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.375rem;
}

.file-upload__form-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e5e7eb;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.file-upload__form-fields {
  flex: 1;
  min-width: 0;
}

.file-upload__form-filename {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-upload__form-filesize {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.file-upload__form-row {
  margin-bottom: 0.75rem;
}

.file-upload__form-row:last-child {
  margin-bottom: 0;
}

.file-upload__form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
}

.file-upload__form-select,
.file-upload__form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.file-upload__form-select:focus,
.file-upload__form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px solid rgba(59, 130, 246, 0.5);
}

.file-upload__form-remove {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: white;
  color: #ef4444;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.file-upload__form-remove:hover {
  background-color: #fee2e2;
}

.file-upload__form-remove svg {
  width: 1rem;
  height: 1rem;
}

.file-upload__modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.file-upload__modal-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-upload__modal-btn--cancel {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.file-upload__modal-btn--cancel:hover {
  background-color: #f9fafb;
}

.file-upload__modal-btn--upload {
  background-color: #3b82f6;
  color: white;
}

.file-upload__modal-btn--upload:hover:not(:disabled) {
  background-color: #2563eb;
}

.file-upload__modal-btn--upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
