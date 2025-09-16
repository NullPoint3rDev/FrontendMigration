import React, { useState, useEffect } from 'react';
import { getUserNotifications, markNotificationAsRead, deleteNotification, getAutomatedReportNotifications } from '../api/notificationApi';
import '../styles/notificationsSection.css';

const NotificationsSection = () => {
    const [notifications, setNotifications] = useState([]);
    const [filteredNotifications, setFilteredNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedNotification, setSelectedNotification] = useState(null);


    useEffect(() => {
        loadNotifications();
    }, []);

    useEffect(() => {
        filterNotifications();
    }, [notifications, searchTerm, statusFilter, typeFilter]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            // Получаем ID пользователя из localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            console.log('NotificationsSection: User from localStorage:', user);
            if (user && user.id) {
                console.log('NotificationsSection: Loading notifications for user ID:', user.id);
                // Загружаем обычные уведомления (исключая автоматические отчеты)
                const regularNotifications = await getUserNotifications(user.id);
                console.log('NotificationsSection: Regular notifications:', regularNotifications);
                
                // Загружаем уведомления о автоматических отчетах
                const automatedReportNotifications = await getAutomatedReportNotifications(user.id);
                console.log('NotificationsSection: Automated report notifications:', automatedReportNotifications);
                
                // Фильтруем обычные уведомления, исключая автоматические отчеты
                const filteredRegularNotifications = regularNotifications.filter(
                    notification => notification.type !== 'AUTOMATED_REPORT' && notification.type !== 'AUTOMATED_REPORT_ERROR'
                );
                console.log('NotificationsSection: Filtered regular notifications:', filteredRegularNotifications);
                
                // Объединяем уведомления без дублирования
                const allNotifications = [...filteredRegularNotifications, ...automatedReportNotifications];
                
                // Сортируем по дате создания (новые сверху)
                allNotifications.sort((a, b) => {
                    const dateA = a.dateCreated || a.createdAt;
                    const dateB = b.dateCreated || b.createdAt;
                    return new Date(dateB) - new Date(dateA);
                });
                
                console.log('NotificationsSection: All notifications:', allNotifications);
                if (allNotifications.length > 0) {
                    console.log('NotificationsSection: First notification structure:', allNotifications[0]);
                    console.log('NotificationsSection: First notification keys:', Object.keys(allNotifications[0]));
                }
                setNotifications(allNotifications);
            } else {
                console.warn('NotificationsSection: No user or user.id found in localStorage');
                setNotifications([]);
            }
        } catch (err) {
            setError('Ошибка при загрузке уведомлений');
            console.error('Error loading notifications:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const filterNotifications = () => {
        let filtered = [...notifications];

        // Поиск по тексту
        if (searchTerm) {
            filtered = filtered.filter(notification =>
                notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                notification.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Фильтр по статусу
        if (statusFilter !== 'all') {
            filtered = filtered.filter(notification => notification.status === statusFilter);
        }

        // Фильтр по типу
        if (typeFilter !== 'all') {
            filtered = filtered.filter(notification => notification.type === typeFilter);
        }

        setFilteredNotifications(filtered);
        setPage(1); // Сброс на первую страницу при изменении фильтров
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await markNotificationAsRead(notificationId);
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, status: 'READ' }
                        : notification
                )
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await deleteNotification(notificationId);
            setNotifications(prev =>
                prev.filter(notification => notification.id !== notificationId)
            );
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    const handleMenuOpen = (event, notification) => {
        setAnchorEl(event.currentTarget);
        setSelectedNotification(notification);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedNotification(null);
    };


    const getTypeLabel = (type) => {
        if (!type) return 'Неизвестно';
        const labels = {
            SUCCESS: 'Успех',
            ERROR: 'Ошибка',
            WARNING: 'Предупреждение',
            INFO: 'Информация',
            SYSTEM: 'Система',
            AUTOMATED_REPORT: 'Автоматические отчеты',
            AUTOMATED_REPORT_ERROR: 'Ошибки автоматических отчетов'
        };
        return labels[type] || type;
    };


    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    if (loading) {
        return (
            <div className="notifications-loading">
                <div className="loading-spinner"></div>
                <p>Загрузка уведомлений...</p>
            </div>
        );
    }

    return (
        <div className="notifications-section">
            <div className="notifications-controls">
                <div className="search-filters">
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Поиск уведомлений..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Все статусы</option>
                        <option value="UNREAD">Непрочитанные</option>
                        <option value="READ">Прочитанные</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Все типы</option>
                        <option value="SUCCESS">Успех</option>
                        <option value="ERROR">Ошибка</option>
                        <option value="WARNING">Предупреждение</option>
                        <option value="INFO">Информация</option>
                        <option value="SYSTEM">Система</option>
                        <option value="AUTOMATED_REPORT">Автоматические отчеты</option>
                        <option value="AUTOMATED_REPORT_ERROR">Ошибки автоматических отчетов</option>
                    </select>
                </div>
                
                <button 
                    className="refresh-btn"
                    onClick={loadNotifications}
                    disabled={loading}
                >
                    <i className="fas fa-sync-alt"></i>
                    Обновить
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    {error}
                </div>
            )}

            {/* Список уведомлений */}
            {paginatedNotifications.length === 0 ? (
                <div className="no-notifications">
                    <i className="fas fa-bell-slash"></i>
                    <h3>Уведомления не найдены</h3>
                    <p>Попробуйте изменить фильтры или поисковый запрос</p>
                </div>
            ) : (
                <>
                    <table className="notifications-table">
                        <thead>
                            <tr>
                                <th>Тип</th>
                                <th>Сообщение</th>
                                <th>Статус</th>
                                <th>Дата</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedNotifications.map((notification) => (
                                <tr 
                                    key={notification.id} 
                                    className={`notification-row ${notification.status === 'UNREAD' ? 'unread' : 'read'}`}
                                    onClick={() => {
                                        // При клике на строку переходим к отчетам для автоматических отчетов
                                        if (notification.type === 'AUTOMATED_REPORT') {
                                            window.location.href = '/reports/history';
                                        }
                                    }}
                                >
                                    <td>
                                        <span className={`type-badge ${notification.type ? notification.type.toLowerCase() : 'unknown'}`}>
                                            {getTypeLabel(notification.type)}
                                        </span>
                                    </td>
                                    <td className="notification-message-cell">
                                        {notification.message || notification.content || 'Без сообщения'}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${notification.status ? notification.status.toLowerCase() : 'unknown'}`}>
                                            {notification.status === 'UNREAD' ? 'Новое' : 'Прочитано'}
                                        </span>
                                    </td>
                                    <td className="notification-date-cell">
                                        {notification.dateCreated ? 
                                            new Date(notification.dateCreated).toLocaleString('ru-RU') :
                                            notification.createdAt ? 
                                                new Date(notification.createdAt).toLocaleString('ru-RU') :
                                                'Дата не указана'
                                        }
                                    </td>
                                    <td>
                                        <div className="notification-actions">
                                            {/* Специальная обработка для уведомлений о автоматических отчетах */}
                                            {notification.type === 'AUTOMATED_REPORT' && (
                                                <button 
                                                    className="action-btn view-report"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Предотвращаем всплытие события
                                                        // Переходим на страницу с отчетами
                                                        window.location.href = '/reports/history';
                                                    }}
                                                >
                                                    <i className="fas fa-file-alt"></i>
                                                    <span>Посмотреть отчет</span>
                                                </button>
                                            )}
                                            <button 
                                                className="action-btn menu"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Предотвращаем всплытие события
                                                    handleMenuOpen(e, notification);
                                                }}
                                            >
                                                <i className="fas fa-ellipsis-v"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Пагинация */}
                    {filteredNotifications.length > itemsPerPage && (
                        <div className="pagination">
                            <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(null, page - 1)}
                                disabled={page === 1}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            
                            <span className="pagination-info">
                                Страница {page} из {Math.ceil(filteredNotifications.length / itemsPerPage)}
                            </span>
                            
                            <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(null, page + 1)}
                                disabled={page === Math.ceil(filteredNotifications.length / itemsPerPage)}
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Контекстное меню */}
            {anchorEl && (
                <div className="context-menu-overlay" onClick={handleMenuClose}>
                    <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                        {selectedNotification?.status === 'UNREAD' && (
                            <button 
                                className="context-menu-item"
                                onClick={() => {
                                    handleMarkAsRead(selectedNotification.id);
                                    handleMenuClose();
                                }}
                            >
                                <i className="fas fa-check"></i>
                                Отметить как прочитанное
                            </button>
                        )}
                        <button 
                            className="context-menu-item delete"
                            onClick={() => {
                                handleDelete(selectedNotification.id);
                                handleMenuClose();
                            }}
                        >
                            <i className="fas fa-trash"></i>
                            Удалить
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsSection;
