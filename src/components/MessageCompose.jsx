import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import '../styles/messages.css';

const MessageCompose = ({ onClose, onSend, replyTo, forwardData, userId }) => {
  const [recipient, setRecipient] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef();
  const dropdownRef = useRef();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);

  // Автозаполнение для replyTo и forwardData
  useEffect(() => {
    if (replyTo) {
      setRecipient(`${replyTo.sender?.lastName || ''} ${replyTo.sender?.firstName || ''} (${replyTo.sender?.userName || ''})`);
      setRecipientId(replyTo.sender?.id || '');
      setSubject('Re: ' + (replyTo.subject || ''));
      setBody(`\n\n--- Исходное сообщение ---\n${replyTo.body || ''}`);
    } else if (forwardData) {
      setRecipient('');
      setRecipientId('');
      setSubject(forwardData.subject || '');
      setBody(`\n\n--- Пересылаемое сообщение ---\n${forwardData.body || ''}`);
      // Вложения только имена (без файлов)
      setFiles([]);
    }
  }, [replyTo, forwardData]);

  useEffect(() => {
    setLoadingUsers(true);
    setUsersError(null);
    api.getAllUsers()
        .then(data => {
          setUsers(data);
          setLoadingUsers(false);
        })
        .catch(e => {
          setUsersError('Ошибка загрузки пользователей');
          setLoadingUsers(false);
        });
  }, []);

  useEffect(() => {
    if (recipient.length === 0) {
      setFiltered([]);
      setShowDropdown(false);
      setRecipientId('');
      setHighlighted(-1);
      return;
    }

    const rec = recipient.toLowerCase();
    // Фильтруем только валидных пользователей
    const f = users
      .filter(u => u.id && (u.lastName || u.firstName || u.userName))
      .filter(u =>
        `${u.lastName || ''} ${u.firstName || ''} ${u.userName || ''}`.toLowerCase().includes(rec)
      );

    setFiltered(f);
    setShowDropdown(f.length > 0);
    setHighlighted(-1);
  }, [recipient, users]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSelectUser = (user) => {
    setRecipient(`${user.lastName} ${user.firstName} (${user.userName})`);
    setRecipientId(user.id);
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && highlighted < filtered.length) {
        handleSelectUser(filtered[highlighted]);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    if (showDropdown && dropdownRef.current && highlighted >= 0) {
      const el = dropdownRef.current.children[highlighted];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, showDropdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientId || isNaN(Number(recipientId))) {
      // Можно показать ошибку пользователю
      return;
    }

    const formData = new FormData();
    formData.append('message', JSON.stringify({
      sender: { id: userId },
      recipient: { id: Number(recipientId) },
      subject,
      body
    }));

    files.forEach(f => formData.append('files', f));

    if (onSend) {
      await onSend(formData);
      onClose();
    }
  };

  return (
      <div className="compose-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="compose-modal compose-modal-animated">
          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Визуальное выделение режима */}
            {replyTo && <div className="compose-mode-banner reply">Ответ на сообщение</div>}
            {forwardData && <div className="compose-mode-banner forward">Пересылка сообщения</div>}
            <h2>Новое сообщение</h2>

            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label>
                Получатель:
                <input
                    type="text"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    required
                    autoComplete="off"
                    ref={inputRef}
                    onFocus={() => setShowDropdown(filtered.length > 0)}
                    onKeyDown={handleKeyDown}
                    disabled={!!replyTo} // Если replyTo — disabled
                />
              </label>

              {loadingUsers && (
                  <div style={{ position: 'absolute', top: 48, color: '#aaa' }}>
                    Загрузка пользователей...
                  </div>
              )}

              {usersError && (
                  <div style={{ color: 'red' }}>{usersError}</div>
              )}

              {showDropdown && (
                  <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: 48,
                        background: '#333',
                        borderRadius: 6,
                        zIndex: 10,
                        maxHeight: 180,
                        overflowY: 'auto',
                        width: '100%'
                      }}
                  >
                    {filtered.map((u, i) => (
                        <div
                            key={u.id}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #444',
                              background: highlighted === i ? '#444' : undefined
                            }}
                            onClick={() => handleSelectUser(u)}
                            onMouseEnter={() => setHighlighted(i)}
                        >
                          {((u.lastName || '') + ' ' + (u.firstName || '')).trim() || u.userName}
                          {((u.lastName || '') + ' ' + (u.firstName || '')).trim() && u.userName
                            ? <span style={{ color: '#aaa' }}> ({u.userName})</span>
                            : null}
                        </div>
                    ))}
                  </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>
                Тема:
                <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                />
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>
                Сообщение:
                <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    required
                    style={{ minHeight: 80 }}
                />
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>
                Вложения:
                <input type="file" multiple onChange={handleFileChange} />
              </label>
            </div>

            {/* При пересылке — показать имена вложений */}
            {forwardData && forwardData.attachments && forwardData.attachments.length > 0 && (
              <div className="compose-forward-attachments">
                <b>Вложения для пересылки:</b>
                <ul>
                  {forwardData.attachments.map((a, i) => (
                    <li key={i}>📎 {a.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="btn-action cancel-action">
                Отмена
              </button>
              <button
                  type="submit"
                  style={{
                    background: '#6C63FF',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: 6
                  }}
                  className="btn-action main-action"
                  disabled={!recipientId || !subject || !body}
              >
                Отправить
              </button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default MessageCompose;