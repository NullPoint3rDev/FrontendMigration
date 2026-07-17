import React, { useEffect, useState } from 'react';
import { fetchLibraryDocuments, uploadLibraryDocument, downloadLibraryDocument, deleteLibraryDocument } from '../api/libraryApi';
import { formatMoscowDateTime } from '../utils/moscowTime';
import '../styles/equipmentPage.css';

const LibraryPage = () => {
  const [documents, setDocuments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState('');
  const [uploader, setUploader] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadDocuments = async () => {
    try {
      const res = await fetchLibraryDocuments();
      setDocuments(Array.isArray(res) ? res : []);
    } catch (e) {
      setError('Ошибка загрузки документов');
      setDocuments([]);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const openModal = () => {
    setFile(null);
    setComment('');
    setUploader('');
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFile(null);
    setComment('');
    setUploader('');
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !uploader) {
      setError('Выберите файл и введите имя пользователя');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await uploadLibraryDocument(file, comment, uploader);
      closeModal();
      loadDocuments();
    } catch (e) {
      setError('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://89.109.8.59:8085/api'}/library-documents/${id}/download`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        }
      );
      if (!response.ok) throw new Error('Ошибка скачивания файла');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Ошибка скачивания файла');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот документ?')) return;
    try {
      await deleteLibraryDocument(id);
      loadDocuments();
    } catch (e) {
      setError('Ошибка удаления документа');
    }
  };

  return (
    <div className="container equipment-page">
      <div className="header equipment-header">
        <h1 className="equipment-title">Библиотека документов</h1>
        <button className="add-btn" onClick={openModal}>Добавить</button>
      </div>
      {error && <div className="error-message" style={{ marginBottom: 8 }}>{error}</div>}
      <table className="organizations-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Комментарий</th>
            <th>Загрузил</th>
            <th>Дата</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id}>
              <td>{doc.fileName}</td>
              <td>{doc.comment}</td>
              <td>{doc.uploader}</td>
              <td>{doc.uploadDate ? formatMoscowDateTime(doc.uploadDate) : ''}</td>
              <td>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="action-btn edit" onClick={() => handleDownload(doc.id, doc.fileName)}>
                    <span>Скачать</span>
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(doc.id)}>
                    <span>Удалить</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Modal */}
      <div className={`modal${modalOpen ? ' active' : ''}`} onClick={e => { if (e.target.classList.contains('modal')) closeModal(); }}>
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">Загрузить документ</h2>
            <button className="close-btn" onClick={closeModal}>&times;</button>
          </div>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label className="required">Файл</label>
              <input type="file" onChange={handleFileChange} />
            </div>
            <div className="form-group">
              <label className="required">Имя пользователя</label>
              <input type="text" value={uploader} onChange={e => setUploader(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Комментарий</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)} style={{ width: '100%', minHeight: 60 }} />
            </div>
            <div className="modal-footer">
              <button type="button" className="modal-btn cancel" onClick={closeModal}>Отмена</button>
              <button type="submit" className="modal-btn save" disabled={uploading}>{uploading ? 'Загрузка...' : 'Загрузить'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LibraryPage; 