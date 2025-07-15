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
    await createInboxMessage(formData);
    setShowCompose(false);
    fetchMessages();
    fetchUnreadCounts();
  };

  const filtered = messages.filter(folderMap[folder] || (() => true));
  const displayed = search ? filtered.filter(m =>
      (m.subject || '').toLowerCase().includes(search.toLowerCase())) : filtered;
  const selectedMessage = messages.find(m => m.id === selectedId);
  const isEmpty = !loading && !error && displayed.length === 0;

  return (
      <div className="messages-page">
        <div className="mail-header">Почта</div>
        <div className="mail-tabs">
          <button className={`tab-btn ${folder === 'inbox' ? 'active' : ''}`} onClick={() => setFolder('inbox')}>Входящие</button>
          <button className={`tab-btn ${folder === 'sent' ? 'active' : ''}`} onClick={() => setFolder('sent')}>Отправленные</button>
          <button className={`tab-btn ${folder === 'drafts' ? 'active' : ''}`} onClick={() => setFolder('drafts')}>Черновики</button>
          <button className={`tab-btn ${folder === 'trash' ? 'active' : ''}`} onClick={() => setFolder('trash')}>Корзина</button>
        </div>

        <div className="messages-layout">
          <div className="messages-col folders-col">
            <MessageFolders
                selected={folder}
                onSelect={setFolder}
                unreadCounts={unreadCounts}
            />
          </div>

          <div className="messages-col main-col">
            <div className="messages-list-container">
              {isEmpty ? (
                  <div className="messages-empty-state">
                    <div className="messages-empty-icon">📭</div>
                    <div className="messages-empty-text">Нет сообщений</div>
                    <button
                        className="btn-action main-action"
                        onClick={() => setShowCompose(true)}
                    >
                      + Новое сообщение
                    </button>
                  </div>
              ) : (
                  <MessagesList
                      messages={displayed}
                      onSelect={handleSelect}
                      selectedId={selectedId}
                      loading={loading}
                  />
              )}
            </div>
          </div>

          <div className="messages-col preview-col">
            <MessagePreview
                message={selectedMessage}
                onDelete={handleDelete}
                onNewMessage={() => setShowCompose(true)}
            />
          </div>
        </div>

        {showCompose && (
            <MessageCompose
                onClose={() => setShowCompose(false)}
                onSend={handleSend}
            />
        )}
      </div>
  );
};

export default MessagesPage;