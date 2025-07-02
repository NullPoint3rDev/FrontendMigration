import React from 'react';
import './messages.css';
import { downloadInboxMessageAttachment } from '../api/inboxMessageApi';

const MessagePreview = ({ message, onDelete, onNewMessage }) => {
  if (!message) {
    return (
      <div className="message-preview-empty-full">
        <div className="message-preview-empty-icon">✉️</div>
        <div className="message-preview-empty-title">Выберите или создайте письмо для просмотра</div>
        {onNewMessage && <button className="btn-action btn-large" onClick={onNewMessage}>+ Новое сообщение</button>}
      </div>
    );
  }
  const handleDelete = () => {
    if (window.confirm('Вы действительно хотите удалить это письмо?')) {
      onDelete && onDelete(message.id);
    }
  };
  const handleDownload = (attachment) => {
    downloadInboxMessageAttachment(message.id, attachment.id, attachment.name);
  };
  return (
    <div className="message-preview">
      <div className="preview-header">
        <div className="preview-subject">{message.subject || '(Без темы)'}</div>
        <div className="preview-date">{message.dateSent ? new Date(message.dateSent).toLocaleString() : ''}</div>
      </div>
      <div className="preview-meta">
        <span><b>От:</b> {message.sender ? `${message.sender.lastName} ${message.sender.firstName}` : ''}</span><br/>
        <span><b>Кому:</b> {message.recipient ? `${message.recipient.lastName} ${message.recipient.firstName}` : ''}</span>
      </div>
      {message.attachments && message.attachments.length > 0 && (
        <div className="preview-attachments">
          <b>Вложения:</b> {message.attachments.map((a, i) => (
            <span key={i} className="preview-attach">
              📎 {a.name}
              <button className="btn-download" title="Скачать" onClick={() => handleDownload(a)}>
                ⬇️
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="preview-body">{message.body || <i>(Нет текста)</i>}</div>
      <div className="preview-actions">
        <button className="btn-action">Ответить</button>
        <button className="btn-action btn-danger" onClick={handleDelete}>Удалить</button>
      </div>
    </div>
  );
};

export default MessagePreview; 