import React, { useState, useEffect } from 'react';
import MessagesList from '../components/MessagesList';
import MessageCompose from '../components/MessageCompose';
import { api } from '../services/api';
import { FaInbox, FaPaperPlane, FaRegFileAlt, FaTrash } from 'react-icons/fa';

const MessagesPage = () => {
  const [tab, setTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalMessage, setModalMessage] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forwardData, setForwardData] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [userId, setUserId] = useState(null); // добавлено состояние для userId

  // Получаем id пользователя при монтировании
  useEffect(() => {
    api.getCurrentUser().then(user => {
      setUserId(user.id);
    });
  }, []);

  // Загружаем сообщения только когда userId получен
  useEffect(() => {
    if (!userId) return;
    api.getMessages(tab, userId).then(data => setMessages(Array.isArray(data) ? data : []));
  }, [tab, userId]);

  // Фильтрация по поиску
  const filteredMessages = messages.filter(msg => {
    const q = search.toLowerCase();
    return (
      (msg.subject || '').toLowerCase().includes(q) ||
      (msg.body || '').toLowerCase().includes(q) ||
      ((msg.sender?.firstName || '') + ' ' + (msg.sender?.lastName || '')).toLowerCase().includes(q)
    );
  });

  // Массовое удаление
  const handleMassDelete = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => api.deleteMessage(id)));
      setMessages(prev => Array.isArray(prev) ? prev.filter(m => !selectedIds.includes(m.id)) : []);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  };

  // Массовое отметить как прочитанное
  const handleMassMarkRead = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => api.markAsRead(id)));
      setMessages(prev => Array.isArray(prev) ? prev.map(m => selectedIds.includes(m.id) ? { ...m, isRead: true } : m) : []);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  };

  const onToggleSelect = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const onOpenMessage = (msg) => {
    setModalMessage(msg);
  };

  const onCloseModal = () => setModalMessage(null);

  const handleSend = async (formData) => {
    setLoading(true);
    setAlert(null);
    try {
      await api.sendMessage(formData);
      setAlert('Сообщение отправлено!');
      setComposeOpen(false);
      setReplyTo(null);
      if (tab === 'outbox') {
        api.getMessages('outbox', userId).then(setMessages);
      }
      if (tab === 'inbox') {
        api.getMessages('inbox', userId).then(setMessages);
      }
    } catch (e) {
      setAlert('Ошибка отправки сообщения');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = () => {
    setReplyTo(modalMessage);
    setModalMessage(null);
    setComposeOpen(true);
  };

  const handleForward = () => {
    setForwardData({
      subject: 'FWD: ' + (modalMessage.subject || ''),
      body: modalMessage.body || '',
      attachments: modalMessage.attachments || []
    });
    setModalMessage(null);
    setComposeOpen(true);
  };

  const handleDeleteSingle = async () => {
    if (!modalMessage) return;
    setLoading(true);
    try {
      await api.deleteMessage(modalMessage.id);
      setMessages(prev => Array.isArray(prev) ? prev.filter(m => m.id !== modalMessage.id) : []);
      setAlertMsg('Письмо удалено');
      setModalMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const res = await api.downloadAttachment(attachment.id);
      const url = window.URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setAlertMsg('Ошибка скачивания вложения');
    }
  };

  const handleDelete = async () => {
    if (!selectedIds.length) return;
    setConfirmDeleteOpen(false);
    setLoading(true);
    setAlert(null);
    try {
      await api.deleteMessages(selectedIds);
      setAlert('Сообщения удалены');
      setSelectedIds([]);
      api.getMessages(tab, userId).then(setMessages);
    } catch (e) {
      setAlert('Ошибка удаления сообщений');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!selectedIds.length) return;
    setLoading(true);
    setAlert(null);
    try {
      await api.markAsReadMessages(selectedIds);
      setAlert('Отмечено как прочитанное');
      api.getMessages(tab, userId).then(setMessages);
      setSelectedIds([]); // Clear selectedIds after marking as read
    } catch (e) {
      setAlert('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  // 1. Подсчёт непрочитанных писем для индикаторов
  const unreadCount = messages.filter(m => !m.isRead).length;
  const unreadByTab = {
    inbox: messages.filter(m => !m.isRead && tab === 'inbox').length,
    outbox: messages.filter(m => !m.isRead && tab === 'outbox').length,
    drafts: messages.filter(m => !m.isRead && tab === 'drafts').length,
    trash: messages.filter(m => !m.isRead && tab === 'trash').length,
  };

  return (
    <div className="messages-page">
      <div className="mail-header-bar">
        <h1 className="equipment-title">Почта</h1>
        <input
          className="mail-search"
          type="text"
          placeholder="Поиск по письмам..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button className="btn-action main-action" onClick={() => setComposeOpen(true)}>
          Новое сообщение
        </button>
      </div>
      <div className="mail-layout">
        <aside className="mail-sidebar">
          <button className={`mail-sidebar-btn${tab==='inbox' ? ' active' : ''}`} onClick={() => setTab('inbox')}>
            <FaInbox className="icon" />Входящие
            {unreadByTab.inbox > 0 && <span className="mail-unread-badge">{unreadByTab.inbox}</span>}
          </button>
          <button className={`mail-sidebar-btn${tab==='outbox' ? ' active' : ''}`} onClick={() => setTab('outbox')}>
            <FaPaperPlane className="icon" />Отправленные
            {unreadByTab.outbox > 0 && <span className="mail-unread-badge">{unreadByTab.outbox}</span>}
          </button>
          <button className={`mail-sidebar-btn${tab==='drafts' ? ' active' : ''}`} onClick={() => setTab('drafts')}>
            <FaRegFileAlt className="icon" />Черновики
            {unreadByTab.drafts > 0 && <span className="mail-unread-badge">{unreadByTab.drafts}</span>}
          </button>
          <button className={`mail-sidebar-btn${tab==='trash' ? ' active' : ''}`} onClick={() => setTab('trash')}>
            <FaTrash className="icon" />Корзина
            {unreadByTab.trash > 0 && <span className="mail-unread-badge">{unreadByTab.trash}</span>}
          </button>
        </aside>
        <section className="mail-main">
          {selectedIds.length > 0 && (
            <div className="mail-actions" style={{ animation: 'fadeInOverlay 0.25s' }}>
              <span>{selectedIds.length} выбрано</span>
              <button className="btn-action" onClick={handleMassDelete}>Удалить</button>
              <button className="btn-action" onClick={handleMassMarkRead}>Отметить как прочитанное</button>
        </div>
          )}
          <MessagesList
            messages={filteredMessages}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onOpenMessage={onOpenMessage}
            loading={loading}
          />
          {filteredMessages.length === 0 && !loading && (
            <div className="mail-placeholder">Нет писем по вашему запросу</div>
          )}
        </section>
      </div>
      {modalMessage && (
        <div className="mail-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCloseModal(); }}>
          <div className="mail-modal" style={{ animation: 'scaleInModal 0.28s cubic-bezier(.4,1.4,.6,1) both' }}>
            <div className="mail-modal-header">{modalMessage.subject || '(Без темы)'}</div>
            <div className="mail-modal-body">{modalMessage.body || '(Нет текста)'}</div>
            {modalMessage.attachments && modalMessage.attachments.length > 0 && (
              <div className="mail-modal-attachments">
                <b>Вложения:</b>
                {modalMessage.attachments.map((a, i) => (
                  <div key={i} className="mail-modal-attach">
                    📎 {a.name}
                    <button className="btn-action" onClick={() => handleDownloadAttachment(a)}>Скачать</button>
                  </div>
                ))}
              </div>
            )}
            <div className="mail-modal-actions">
              <button className="btn-action" onClick={onCloseModal}>Закрыть</button>
              <button className="btn-action" onClick={handleReply}>Ответить</button>
              <button className="btn-action" onClick={handleForward}>Переслать</button>
              <button className="btn-action" onClick={handleDeleteSingle}>Удалить</button>
            </div>
          </div>
        </div>
      )}
      {composeOpen && (
        <MessageCompose
          onClose={() => { setComposeOpen(false); setReplyTo(null); setForwardData(null); }}
          onSend={handleSend}
          replyTo={replyTo}
          forwardData={forwardData}
          userId={userId}
        />
      )}
      {confirmDeleteOpen && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.3)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',padding:32,borderRadius:12,boxShadow:'0 2px 16px #0002',minWidth:320}}>
            <div style={{fontSize:18,marginBottom:24}}>Удалить это сообщение?</div>
            <div style={{display:'flex',gap:16,justifyContent:'flex-end'}}>
              <button onClick={()=>setConfirmDeleteOpen(false)} style={{padding:'8px 20px'}}>Отмена</button>
              <button onClick={handleDelete} style={{padding:'8px 20px',background:'#d32f2f',color:'#fff',border:'none',borderRadius:4}}>Удалить</button>
            </div>
          </div>
        </div>
      )}
      {loading && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.2)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:24}}>Загрузка...</div>}
      {alert && <div style={{position:'fixed',top:20,right:20,background:'#222',color:'#fff',padding:'12px 24px',borderRadius:8,zIndex:2001}}>{alert}</div>}
      {alertMsg && (
        <div style={{position:'fixed',top:20,right:20,background:'#222',color:'#fff',padding:'12px 24px',borderRadius:8,zIndex:2001}}>{alertMsg}</div>
      )}
    </div>
  );
};

export default MessagesPage; 