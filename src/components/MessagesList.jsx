import React from 'react';
import './messages.css';

const MessagesList = ({ messages, onSelect, selectedId, onNewMessage, loading }) => {
  if (loading) {
    return <div className="messages-loading">Загрузка сообщений...</div>;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return (
      <div className="messages-empty-state">
        <div className="messages-empty-icon">📭</div>
        <div className="messages-empty-text">Нет сообщений</div>
        {onNewMessage && <button className="btn-action" onClick={onNewMessage}>+ Новое сообщение</button>}
      </div>
    );
  }
  return (
    <div className="messages-list">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`message-item${msg.isRead ? '' : ' unread'}${selectedId === msg.id ? ' selected' : ''}`}
          onClick={() => onSelect(msg)}
        >
          <div className="message-avatar">{msg.sender?.firstName?.[0] || '?'}</div>
          <div className="message-content">
            <div className="message-header">
              <span className="message-subject">{msg.subject || '(Без темы)'}</span>
              <span className="message-date">{msg.dateSent ? new Date(msg.dateSent).toLocaleString() : ''}</span>
            </div>
            <div className="message-meta">
              <span className="message-from">{msg.sender ? `${msg.sender.lastName} ${msg.sender.firstName}` : ''}</span>
              <span className="message-to">→ {msg.recipient ? `${msg.recipient.lastName} ${msg.recipient.firstName}` : ''}</span>
              {msg.attachments && msg.attachments.length > 0 && <span className="message-attach">📎</span>}
              <span className="message-status">{msg.isRead ? 'Прочитано' : 'Непрочитано'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessagesList; 