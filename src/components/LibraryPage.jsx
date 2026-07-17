import React, { useEffect, useState } from 'react';
import { fetchLibraryDocuments, uploadLibraryDocument, downloadLibraryDocument } from '../api/libraryApi';
import { formatMoscowDateTime } from '../utils/moscowTime';

const LibraryPage = () => {
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [comment, setComment] = useState('');
  const [uploader, setUploader] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadDocuments = async () => {
    try {
      const res = await fetchLibraryDocuments();
      setDocuments(res.data);
    } catch (e) {
      setError('Ошибка загрузки документов');
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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
      setShowModal(false);
      setFile(null);
      setComment('');
      setUploader('');
      loadDocuments();
    } catch (e) {
      setError('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id, fileName) => {
    try {
      const res = await downloadLibraryDocument(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError('Ошибка скачивания файла');
    }
  };

  return (
    <div className="library-page" style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2>Библиотека документов</h2>
      <button onClick={() => setShowModal(true)} style={{ marginBottom: 16 }}>Добавить</button>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Название</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Комментарий</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Загрузил</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Дата</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {documents.map(doc => (
            <tr key={doc.id}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{doc.fileName}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{doc.comment}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{doc.uploader}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{doc.uploadDate ? formatMoscowDateTime(doc.uploadDate) : ''}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>
                <button onClick={() => handleDownload(doc.id, doc.fileName)}>Скачать</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleUpload} style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h3>Загрузить документ</h3>
            <div style={{ marginBottom: 12 }}>
              <input type="file" onChange={handleFileChange} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Имя пользователя" value={uploader} onChange={e => setUploader(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <textarea placeholder="Комментарий" value={comment} onChange={e => setComment(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={uploading}>{uploading ? 'Загрузка...' : 'Загрузить'}</button>
              <button type="button" onClick={() => setShowModal(false)}>Отмена</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LibraryPage; 