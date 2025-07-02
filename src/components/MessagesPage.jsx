import React, { useState, useEffect } from 'react';
import MessageFolders from './MessageFolders';
import MessagesList from './MessagesList';
import MessagePreview from './MessagePreview';
import MessageCompose from './MessageCompose';
import {
  getAllInboxMessages,
  createInboxMessage,
  deleteInboxMessage,
  markInboxMessageAsRead,
  getUnreadInboxMessages
} from '../api/inboxMessageApi';
import '../styles/messages.css';

const folderMap = {
  inbox: msg => !msg.deleted && !msg.draft && !msg.sent,
  sent: msg => msg.sent,
  drafts: msg => msg.draft,
  trash: msg => msg.deleted,
};

const MessagesPage = () => {
  const [folder, setFolder] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка сообщений
  useEffect(() => {
    fetchMessages();
    fetchUnreadCounts();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllInboxMessages();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Ошибка загрузки писем');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    const unread = await getUnreadInboxMessages();
    // Группируем по папкам (inbox только)
    setUnreadCounts({ inbox: unread.length });
  };

  const handleSelect = (msg) => {
    setSelectedId(msg.id);
    if (!msg.isRead) {
      markInboxMessageAsRead(msg.id).then(fetchMessages).then(fetchUnreadCounts);
    }
  };

  const handleDelete = async (id) => {
    await deleteInboxMessage(id);
    setSelectedId(null);
    fetchMessages();
    fetchUnreadCounts();
  };

  const handleSend = async (formData) => {
    // formData: FormData с message и files
    await createInboxMessage(formData);
    setShowCompose(false);
    fetchMessages();
    fetchUnreadCounts();
  };

  // Фильтрация по папке
  const filtered = messages.filter(folderMap[folder] || (() => true));
  // Поиск
  const displayed = search ? filtered.filter(m => (m.subject || '').toLowerCase().includes(search.toLowerCase())) : filtered;
  const selectedMessage = messages.find(m => m.id === selectedId);
  const isEmpty = !loading && !error && displayed.length === 0;

  return (
    <div className="messages-page">
      <div className="messages-topbar">
        <div className="messages-title">Сообщения</div>
        <div className="messages-actions">
          <button className="btn-action" onClick={() => setShowCompose(true)}>+ Новое сообщение</button>
          <input className="messages-search" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="messages-layout">
        <div className="messages-col folders-col">
          <MessageFolders selected={folder} onSelect={setFolder} unreadCounts={unreadCounts} />
        </div>
        {isEmpty ? (
          <div className="messages-col list-col preview-col merged-empty">
            <MessagePreview message={null} onNewMessage={() => setShowCompose(true)} />
          </div>
        ) : (
          <>
            <div className="messages-col list-col">
              {error ? (
                <div className="messages-loading" style={{color:'#e11d48'}}>{error}</div>
              ) : (
                <MessagesList
                  messages={displayed}
                  onSelect={handleSelect}
                  selectedId={selectedId}
                  onNewMessage={() => setShowCompose(true)}
                  loading={loading}
                />
              )}
            </div>
            <div className="messages-col preview-col">
              <MessagePreview message={selectedMessage} onDelete={handleDelete} onNewMessage={() => setShowCompose(true)} />
            </div>
          </>
        )}
      </div>
      {showCompose && <MessageCompose onClose={() => setShowCompose(false)} onSend={handleSend} />}
    </div>
  );
};

export default MessagesPage; 