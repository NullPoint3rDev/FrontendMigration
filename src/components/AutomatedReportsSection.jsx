import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import CreateAutomatedReportModal from './CreateAutomatedReportModal';
import { getUserAutomatedReports, toggleAutomatedReportStatus, deleteAutomatedReport, createAutomatedReport, getAllAutomatedReports } from '../api/automatedReportsApi';
import '../styles/automatedReportsSection.css';

const AutomatedReportsSection = () => {
    const [automatedReports, setAutomatedReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);


    useEffect(() => {
        loadAutomatedReports();
    }, []);

    useEffect(() => {
        filterReports();
    }, [automatedReports, searchTerm, statusFilter]);

    const loadAutomatedReports = async () => {
        setLoading(true);
        try {
            // Получаем ID пользователя из localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.id) {
                const data = await getUserAutomatedReports(user.id);
                console.log('Debug loaded user reports:', data);
                setAutomatedReports(data);
            } else {
                // Если пользователь не найден, загружаем все отчеты (для админа)
                const data = await getAllAutomatedReports();
                console.log('Debug loaded all reports:', data);
                setAutomatedReports(data);
            }
        } catch (err) {
            setError('Ошибка при загрузке автоматизированных отчетов');
            console.error('Error loading automated reports:', err);
            setAutomatedReports([]);
        } finally {
            setLoading(false);
        }
    };

    const filterReports = () => {
        let filtered = [...automatedReports];

        // Поиск по тексту
        if (searchTerm) {
            filtered = filtered.filter(report =>
                report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.templateName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Фильтр по статусу
        if (statusFilter !== 'all') {
            filtered = filtered.filter(report => report.status === statusFilter);
        }

        setFilteredReports(filtered);
        setPage(1);
    };

    const handleToggleStatus = async (reportId) => {
        try {
            await toggleAutomatedReportStatus(reportId);
            
            setAutomatedReports(prev =>
                prev.map(report =>
                    report.id === reportId
                        ? { 
                            ...report, 
                            status: report.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                            nextRun: report.status === 'ACTIVE' ? null : (report.triggers && report.triggers.length > 0 ? calculateNextRun(report.triggers[0]) : null)
                        }
                        : report
                )
            );
        } catch (err) {
            setError('Ошибка при изменении статуса отчета');
            console.error('Error toggling report status:', err);
        }
    };

    const handleEdit = (report) => {
        // TODO: Implement edit functionality
        console.log('Edit report:', report);
        // Можно открыть модальное окно редактирования или перейти на страницу редактирования
    };

    const handleDelete = async (reportId) => {
        try {
            await deleteAutomatedReport(reportId);
            
            setAutomatedReports(prev =>
                prev.filter(report => report.id !== reportId)
            );
            setDeleteDialogOpen(false);
            setReportToDelete(null);
        } catch (err) {
            setError('Ошибка при удалении отчета');
            console.error('Error deleting report:', err);
        }
    };

    const handleMenuOpen = (event, report) => {
        setAnchorEl(event.currentTarget);
        setSelectedReport(report);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedReport(null);
    };

    const calculateNextRun = (trigger) => {
        if (!trigger || !trigger.type) {
            console.log('Debug calculateNextRun: trigger is undefined or missing type', trigger);
            return null;
        }
        
        if (trigger.type === 'TIME' && trigger.time) {
            const now = new Date();
            const [hours, minutes] = trigger.time.split(':').map(Number);
            
            // Создаем дату на сегодня с указанным временем
            const todayAtTime = new Date(now);
            todayAtTime.setHours(hours, minutes, 0, 0);
            
            console.log('Debug calculateNextRun:', {
                trigger,
                now: now.toISOString(),
                todayAtTime: todayAtTime.toISOString(),
                hours,
                minutes
            });
            
            switch (trigger.value) {
                case 'daily':
                    // Если время уже прошло сегодня, планируем на завтра
                    if (todayAtTime <= now) {
                        todayAtTime.setDate(todayAtTime.getDate() + 1);
                    }
                    return todayAtTime;
                    
                case 'weekly':
                    if (trigger.daysOfWeek) {
                        const days = trigger.daysOfWeek.split(',');
                        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                        const dayNumbers = [0, 1, 2, 3, 4, 5, 6];
                        
                        // Находим ближайший день недели
                        let nextRun = new Date(todayAtTime);
                        let found = false;
                        
                        // Проверяем оставшиеся дни этой недели
                        for (let i = 0; i < 7 && !found; i++) {
                            const checkDate = new Date(todayAtTime);
                            checkDate.setDate(todayAtTime.getDate() + i);
                            const dayName = dayNames[checkDate.getDay()];
                            
                            if (days.includes(dayName)) {
                                if (i === 0 && todayAtTime > now) {
                                    // Сегодня и время еще не прошло
                                    nextRun = todayAtTime;
                                    found = true;
                                } else if (i > 0) {
                                    // Ближайший день в будущем
                                    nextRun = checkDate;
                                    found = true;
                                }
                            }
                        }
                        
                        // Если не нашли в этой неделе, берем первый день следующей недели
                        if (!found && days.length > 0) {
                            const firstDay = dayNumbers[dayNames.indexOf(days[0])];
                            nextRun = new Date(todayAtTime);
                            nextRun.setDate(todayAtTime.getDate() + (7 - todayAtTime.getDay() + firstDay) % 7);
                        }
                        
                        return nextRun;
                    }
                    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    
                case 'monthly':
                    if (trigger.dayOfMonth) {
                        const dayOfMonth = parseInt(trigger.dayOfMonth);
                        const nextRun = new Date(now);
                        nextRun.setDate(dayOfMonth);
                        nextRun.setHours(hours, minutes, 0, 0);
                        
                        // Если день уже прошел в этом месяце, планируем на следующий месяц
                        if (nextRun <= now) {
                            nextRun.setMonth(nextRun.getMonth() + 1);
                        }
                        
                        return nextRun;
                    }
                    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    
                default:
                    return null;
            }
        }
        return null;
    };


    const getStatusLabel = (status) => {
        if (status === 'ACTIVE' || status === true) {
            return 'Активен';
        }
        return 'Неактивен';
    };

    const getTriggerIcon = (triggerType) => {
        switch (triggerType) {
            case 'TIME':
                return 'fa-clock';
            case 'EQUIPMENT_ERROR':
                return 'fa-exclamation-triangle';
            case 'VALUE_THRESHOLD':
                return 'fa-check-circle';
            default:
                return 'fa-cog';
        }
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    if (loading) {
        return (
            <div className="automated-reports-loading">
                <div className="loading-spinner"></div>
                <p>Загрузка автоматизированных отчетов...</p>
            </div>
        );
    }

    return (
        <div className="automated-reports-section">
            <div className="automated-reports-controls">
                <div className="search-filters">
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Поиск автоматизированных отчетов..."
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
                        <option value="ACTIVE">Активные</option>
                        <option value="INACTIVE">Неактивные</option>
                    </select>
                </div>
                
                <div className="action-buttons">
                    <button 
                        className="refresh-btn"
                        onClick={loadAutomatedReports}
                        disabled={loading}
                    >
                        <i className="fas fa-sync-alt"></i>
                        Обновить
                    </button>
                    <button 
                        className="create-btn"
                        onClick={() => setCreateModalOpen(true)}
                    >
                        <i className="fas fa-plus"></i>
                        Создать отчет
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    {error}
                </div>
            )}

            {/* Таблица автоматизированных отчетов */}
            {paginatedReports.length === 0 ? (
                <div className="no-reports">
                    <i className="fas fa-file-alt"></i>
                    <h3>Автоматизированные отчеты не найдены</h3>
                    <p>Создайте первый автоматизированный отчет для автоматической генерации отчетов</p>
                    <button 
                        className="create-btn"
                        onClick={() => setCreateModalOpen(true)}
                    >
                        <i className="fas fa-plus"></i>
                        Создать отчет
                    </button>
                </div>
            ) : (
                <>
                    <table className="automated-reports-table">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Шаблон</th>
                                <th>Триггеры</th>
                                <th>Последний запуск</th>
                                <th>Следующий запуск</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedReports && paginatedReports.map((report, index) => (
                                <tr key={report.id || `report-${index}`}>
                                    <td>
                                        <div className="report-name-cell">
                                            <span className="report-name">{report.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="template-name">{report.templateName}</span>
                                    </td>
                                    <td>
                                        <div className="triggers-cell">
                                            {report.triggers && report.triggers.map((trigger, index) => (
                                                <span key={`${report.id || 'report'}-trigger-${index}`} className="trigger-tag">
                                                    <i className={`fas ${getTriggerIcon(trigger.type)}`}></i>
                                                    {trigger.description}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="date-value">
                                            {report.lastRun ? format(report.lastRun, 'dd.MM.yyyy HH:mm', { locale: ru }) : 'Никогда'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="date-value">
                                            {report.nextRun ? format(report.nextRun, 'dd.MM.yyyy HH:mm', { locale: ru }) : 'Не запланирован'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="status-cell">
                                            <span className={`status-badge ${report.status && typeof report.status === 'string' ? report.status.toLowerCase() : 'inactive'}`}>
                                                {getStatusLabel(report.status)}
                                            </span>
                                            <div className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    id={`toggle-${report.id}`}
                                                    checked={report.status === 'ACTIVE' || report.isActive === true}
                                                    onChange={() => handleToggleStatus(report.id)}
                                                />
                                                <label htmlFor={`toggle-${report.id}`} className="toggle-label">
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => handleEdit(report)}
                                                title="Редактировать"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDelete(report.id)}
                                                title="Удалить"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Пагинация */}
                    {filteredReports.length > itemsPerPage && (
                        <div className="pagination">
                            <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(null, page - 1)}
                                disabled={page === 1}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            
                            <span className="pagination-info">
                                Страница {page} из {Math.ceil(filteredReports.length / itemsPerPage)}
                            </span>
                            
                            <button 
                                className="pagination-btn"
                                onClick={() => handlePageChange(null, page + 1)}
                                disabled={page === Math.ceil(filteredReports.length / itemsPerPage)}
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
                        <button 
                            className="context-menu-item"
                            onClick={() => {
                                // TODO: Implement edit functionality
                                handleMenuClose();
                            }}
                        >
                            <i className="fas fa-edit"></i>
                            Редактировать
                        </button>
                        <button 
                            className="context-menu-item delete"
                            onClick={() => {
                                setReportToDelete(selectedReport);
                                setDeleteDialogOpen(true);
                                handleMenuClose();
                            }}
                        >
                            <i className="fas fa-trash"></i>
                            Удалить
                        </button>
                    </div>
                </div>
            )}

            {/* Диалог подтверждения удаления */}
            {deleteDialogOpen && (
                <div className="dialog-overlay" onClick={() => setDeleteDialogOpen(false)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>Подтверждение удаления</h3>
                        </div>
                        <div className="dialog-content">
                            <p>
                                Вы уверены, что хотите удалить автоматизированный отчет "{reportToDelete?.name}"?
                                Это действие нельзя отменить.
                            </p>
                        </div>
                        <div className="dialog-actions">
                            <button 
                                className="cancel-btn"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                Отмена
                            </button>
                            <button 
                                className="delete-btn"
                                onClick={() => handleDelete(reportToDelete?.id)}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно создания автоматизированного отчета */}
            <CreateAutomatedReportModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSave={async (newReport) => {
                    try {
                        // Отправляем отчет на сервер
                        const createdReport = await createAutomatedReport(newReport);
                        setAutomatedReports(prev => [createdReport, ...prev]);
                        setCreateModalOpen(false);
                    } catch (error) {
                        console.error('Error creating automated report:', error);
                        setError('Ошибка при создании автоматизированного отчета');
                    }
                }}
            />
        </div>
    );
};

export default AutomatedReportsSection;
