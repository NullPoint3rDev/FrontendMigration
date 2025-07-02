import React from 'react';
import './messages.css';

const folders = [
  { key: 'inbox', label: 'Входящие', icon: '📥' },
  { key: 'sent', label: 'Отправленные', icon: '📤' },
  { key: 'drafts', label: 'Черновики', icon: '📝' },
  { key: 'trash', label: 'Корзина', icon: '🗑️' },
];

const MessageFolders = ({ selected, onSelect, unreadCounts = {} }) => (
  <div className="folders-list">
    {folders.map(f => (
      <div
        key={f.key}
        className={`folder-item${selected === f.key ? ' selected' : ''}`}
        onClick={() => onSelect(f.key)}
      >
        <span className="folder-icon">{f.icon}</span>
        <span className="folder-label">{f.label}</span>
        {unreadCounts[f.key] > 0 && (
          <span className="folder-unread">{unreadCounts[f.key]}</span>
        )}
      </div>
    ))}
  </div>
);

export default MessageFolders; 