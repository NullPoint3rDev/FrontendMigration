import React, { useState, useEffect } from 'react';
import MessagesList from '../components/MessagesList';
import MessageView from '../components/MessageView';
import MessageCompose from '../components/MessageCompose';
import { api } from '../services/api';

const MessagesPage = () => {
  const [tab, setTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    // TODO: заменить userId на реальный id текущего пользователя
    api.getMessages(tab, 1).then(setMessages);
  }, [tab]);

  const handleSend = async (formData) => {
    setLoading(true);
    setAlert(null);
    try {
      await api.sendMessage(formData);
      setAlert('Сообщение отправлено!');
      setComposeOpen(false);
      setReplyTo(null);
      if (tab === 'outbox') {
        api.getMessages('outbox', 1).then(setMessages);
      }
      if (tab === 'inbox') {
        api.getMessages('inbox', 1).then(setMessages);
      }
    } catch (e) {
      setAlert('Ошибка отправки сообщения');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = () => {
    setReplyTo(selected);
    setComposeOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setConfirmDeleteOpen(false);
    setLoading(true);
    setAlert(null);
    try {
      await api.deleteMessage(selected.id);
      setAlert('Сообщение удалено');
      setSelected(null);
      api.getMessages(tab, 1).then(setMessages);
    } catch (e) {
      setAlert('Ошибка удаления сообщения');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!selected || selected.isRead) return;
    setLoading(true);
    setAlert(null);
    try {
      await api.markAsRead(selected.id);
      setAlert('Отмечено как прочитанное');
      api.getMessages(tab, 1).then(setMessages);
      setSelected({ ...selected, isRead: true });
    } catch (e) {
      setAlert('Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="messages-page">
      <div className="messages-header">
        <button onClick={() => setTab('inbox')} className={tab==='inbox' ? 'active' : ''}>Входящие</button>
        <button onClick={() => setTab('outbox')} className={tab==='outbox' ? 'active' : ''}>Исходящие</button>
        <button onClick={() => { setComposeOpen(true); setReplyTo(null); }}>Новое сообщение</button>
      </div>
      <div className="messages-content" style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <MessagesList messages={messages} onSelect={setSelected} />
        </div>
        <div style={{ flex: 2, minWidth: 0 }}>
          {selected ? (
            <MessageView
              message={selected}
              onReply={handleReply}
              onDelete={() => setConfirmDeleteOpen(true)}
              onMarkAsRead={handleMarkAsRead}
              canReply={tab === 'inbox'}
              canDelete={true}
              canMarkAsRead={tab === 'inbox' && !selected.isRead}
            />
          ) : (
            <div style={{ padding: 32, color: '#888' }}>Выберите письмо для просмотра</div>
          )}
        </div>
      </div>
      {composeOpen && (
        <MessageCompose
          onClose={() => { setComposeOpen(false); setReplyTo(null); }}
          onSend={handleSend}
          replyTo={replyTo}
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
    </div>
  );
};

export default MessagesPage; 