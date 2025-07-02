import React from 'react';

const MessagesList = ({ messages, onSelect }) => {
  if (!Array.isArray(messages)) {
    return <div style={{ padding: 24, color: '#888' }}>Нет сообщений</div>;
  }
  return (
    <div className="messages-list">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Тема</th>
            <th>Отправитель</th>
            <th>Получатель</th>
            <th>Дата</th>
            <th>Вложения</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {messages.map(msg => (
            <tr
              key={msg.id}
              className={msg.isRead ? '' : 'unread'}
              style={{ cursor: 'pointer', background: msg.isRead ? 'inherit' : '#f0f4ff' }}
              onClick={() => onSelect(msg)}
            >
              <td>{msg.subject}</td>
              <td>{msg.sender ? `${msg.sender.lastName} ${msg.sender.firstName}` : ''}</td>
              <td>{msg.recipient ? `${msg.recipient.lastName} ${msg.recipient.firstName}` : ''}</td>
              <td>{msg.dateSent ? new Date(msg.dateSent).toLocaleString() : ''}</td>
              <td>{msg.attachments && msg.attachments.length > 0 ? '📎' : ''}</td>
              <td>{msg.isRead ? 'Прочитано' : 'Непрочитано'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {messages.length === 0 && <div style={{ padding: 24, color: '#888' }}>Нет сообщений</div>}
    </div>
  );
};

export default MessagesList; 