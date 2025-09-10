import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import CreateAutomatedReportModal from './CreateAutomatedReportModal';
import { getUserAutomatedReports, toggleAutomatedReportStatus, deleteAutomatedReport } from '../api/automatedReportsApi';
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
                setAutomatedReports(data);
            } else {
                setAutomatedReports([]);
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
                            nextRun: report.status === 'ACTIVE' ? null : calculateNextRun(report.triggers[0])
                        }
                        : report
                )
            );
        } catch (err) {
            setError('Ошибка при изменении статуса отчета');
            console.error('Error toggling report status:', err);
        }
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
        if (trigger.type === 'TIME') {
            const now = new Date();
            switch (trigger.value) {
                case 'daily':
                    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
                case 'weekly':
                    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                case 'monthly':
                    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
                default:
                    return null;
            }
        }
        return null;
    };


    const getStatusLabel = (status) => {
        return status === 'ACTIVE' ? 'Активен' : 'Неактивен';
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

            {/* Список автоматизированных отчетов */}
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
                    <div className="reports-list">
                        {paginatedReports.map((report) => (
                            <div
                                key={report.id}
                                className={`report-item ${report.status === 'ACTIVE' ? 'active' : 'inactive'}`}
                            >
                                <div className="report-content">
                                    <div className="report-header">
                                        <div className="report-badges">
                                            <span className={`status-badge ${report.status.toLowerCase()}`}>
                                                {getStatusLabel(report.status)}
                                            </span>
                                        </div>
                                        <div className="report-actions">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={report.status === 'ACTIVE'}
                                                    onChange={() => handleToggleStatus(report.id)}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                            <button 
                                                className="report-menu-btn"
                                                onClick={(e) => handleMenuOpen(e, report)}
                                            >
                                                <i className="fas fa-ellipsis-v"></i>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <h4 className="report-title">{report.name}</h4>
                                    <p className="report-template">Шаблон: {report.templateName}</p>

                                    <div className="report-details">
                                        <div className="triggers-section">
                                            <h5>Триггеры:</h5>
                                            {report.triggers.map((trigger, index) => (
                                                <div key={index} className="trigger-item">
                                                    <i className={`fas ${getTriggerIcon(trigger.type)}`}></i>
                                                    <span>{trigger.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="timing-section">
                                            <div className="timing-item">
                                                <strong>Последний запуск:</strong> 
                                                {report.lastRun ? format(report.lastRun, 'dd.MM.yyyy HH:mm', { locale: ru }) : 'Никогда'}
                                            </div>
                                            <div className="timing-item">
                                                <strong>Следующий запуск:</strong> 
                                                {report.nextRun ? format(report.nextRun, 'dd.MM.yyyy HH:mm', { locale: ru }) : 'Не запланирован'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="report-meta">
                                        Создан: {format(report.createdAt, 'dd.MM.yyyy HH:mm', { locale: ru })} пользователем {report.createdBy}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

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
                onSave={(newReport) => {
                    setAutomatedReports(prev => [newReport, ...prev]);
                    setCreateModalOpen(false);
                }}
            />
        </div>
    );
};

export default AutomatedReportsSection;
