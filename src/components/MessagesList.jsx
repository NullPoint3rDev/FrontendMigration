import React from 'react';
import { formatMoscowDateTime } from '../utils/moscowTime';
import '../styles/messages.css';

const MessagesList = ({ messages, selectedIds = [], onToggleSelect, onOpenMessage, loading }) => {
  if (loading) {
    return <div className="mail-placeholder">Загрузка сообщений...</div>;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return (
      <div className="mail-placeholder">
        Нет сообщений
        </div>
    );
  }

  return (
    <table className="mail-list">
      <thead>
        <tr>
          <th></th>
          <th>Отправитель</th>
          <th>Тема</th>
          <th>Дата</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {messages.filter(msg => msg && msg.id).map(msg => (
          <tr
                key={msg.id}
            className={
              (msg.isRead ? '' : 'unread ') + (selectedIds.includes(msg.id) ? 'selected' : '')
            }
            onClick={e => {
              // Не открывать модалку, если клик по чекбоксу
              if (e.target.type !== 'checkbox') onOpenMessage(msg);
            }}
            >
            <td>
              <input
                type="checkbox"
                checked={selectedIds.includes(msg.id)}
                onChange={e => onToggleSelect(msg.id, e.target.checked)}
                onClick={e => e.stopPropagation()}
              />
            </td>
            <td>{msg.sender ? (msg.sender.username || `${msg.sender.lastName || ''} ${msg.sender.firstName || ''}`) : ''}</td>
            <td>
                {msg.subject || '(Без темы)'}
              {msg.attachments && msg.attachments.length > 0 && <span className="icon-attach">📎</span>}
            </td>
            <td>{msg.dateSent ? formatMoscowDateTime(msg.dateSent) : ''}</td>
            <td></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MessagesList;