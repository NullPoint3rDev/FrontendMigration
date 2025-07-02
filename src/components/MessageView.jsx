import React from 'react';

const MessageView = ({ message, onReply, onDelete, onMarkAsRead, canReply, canDelete, canMarkAsRead }) => {
  if (!message) return null;
  return (
    <div className="message-view" style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px #eee' }}>
      <div style={{ marginBottom: 16 }}>
        <b>Тема:</b> {message.subject}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>От:</b> {message.senderName || message.sender}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Кому:</b> {message.recipientName || message.recipient}
      </div>
      <div style={{ marginBottom: 8 }}>
        <b>Дата:</b> {message.dateSent}
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Статус:</b> {message.isRead ? 'Прочитано' : 'Не прочитано'}
      </div>
      <div style={{ marginBottom: 24, whiteSpace: 'pre-line' }}>
        {message.body}
      </div>
      {message.attachments && message.attachments.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <b>Вложения:</b>
          <ul>
            {message.attachments.map(att => (
              <li key={att.id}>
                <a href={att.downloadUrl} target="_blank" rel="noopener noreferrer">{att.filename}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        {canReply && <button onClick={onReply}>Ответить</button>}
        {canDelete && <button onClick={onDelete} style={{ color: 'red' }}>Удалить</button>}
        {canMarkAsRead && <button onClick={onMarkAsRead}>Отметить как прочитанное</button>}
      </div>
    </div>
  );
};

export default MessageView; 