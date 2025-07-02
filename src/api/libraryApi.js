import { api } from '../services/api';

export const fetchLibraryDocuments = () => api.get('/library-documents');

export const uploadLibraryDocument = (file, comment, uploader) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('comment', comment);
  formData.append('uploader', uploader);
  return api.post('/library-documents', formData);
};

export const downloadLibraryDocument = (id) => {
  return api.get(`/library-documents/${id}/download`, { responseType: 'blob' });
}; 