import React, { useState, useMemo } from 'react';
import '../styles/reportViewer.css';

const ReportViewer = ({ data, template, onClose }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterConfig, setFilterConfig] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');

    // Получаем столбцы из шаблона
    const columns = template.columns;

    // Фильтрация и сортировка данных
    const processedData = useMemo(() => {
        let filtered = data;

        // Применяем поиск
        if (searchTerm) {
            filtered = filtered.filter(row =>
                columns.some(column => 
                    String(row[column]).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Применяем фильтры
        Object.entries(filterConfig).forEach(([column, value]) => {
            if (value) {
                filtered = filtered.filter(row =>
                    String(row[column]).toLowerCase().includes(value.toLowerCase())
                );
            }
        });

        // Применяем сортировку
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                
                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [data, columns, searchTerm, filterConfig, sortConfig]);

    // Пагинация
    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = processedData.slice(startIndex, endIndex);

    const handleSort = (column) => {
        setSortConfig(prev => ({
            key: column,
            direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleFilter = (column, value) => {
        setFilterConfig(prev => ({
            ...prev,
            [column]: value
        }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilterConfig({});
        setSearchTerm('');
        setCurrentPage(1);
    };

    const exportToCSV = () => {
        const csvContent = [
            columns.join(','),
            ...processedData.map(row => 
                columns.map(column => `"${row[column] || ''}"`).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${template.name}_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = () => {
        // Создаем Excel-совместимый CSV с BOM для правильного отображения в Excel
        const csvContent = [
            '\uFEFF', // BOM для UTF-8
            columns.join('\t'), // Используем табуляцию вместо запятых для Excel
            ...processedData.map(row => 
                columns.map(column => `"${row[column] || ''}"`).join('\t')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${template.name}_${new Date().toISOString().slice(0, 10)}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSortIcon = (column) => {
        if (sortConfig.key !== column) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="report-viewer-overlay" onClick={onClose}>
            <div className="report-viewer" onClick={(e) => e.stopPropagation()}>
                <div className="report-viewer-header">
                    <div className="report-title-section">
                        <h2>{template.name}</h2>
                        <p className="report-info">
                            Строк: {processedData.length} | 
                            Столбцов: {columns.length} | 
                            Формат: {template.format.toUpperCase()}
                        </p>
                    </div>
                    <div className="report-actions">
                        <button className="export-button csv" onClick={exportToCSV}>
                            📋 CSV
                        </button>
                        <button className="export-button excel" onClick={exportToExcel}>
                            📊 Excel
                        </button>
                        <button className="close-button" onClick={onClose}>
                            ✕
                        </button>
                    </div>
                </div>

                <div className="report-controls">
                    <div className="search-section">
                        <input
                            type="text"
                            placeholder="Поиск по всем столбцам..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="search-input"
                        />
                    </div>

                    <div className="filters-section">
                        {columns.slice(0, 3).map(column => (
                            <div key={column} className="filter-input">
                                <label>{column}:</label>
                                <input
                                    type="text"
                                    placeholder={`Фильтр по ${column}`}
                                    value={filterConfig[column] || ''}
                                    onChange={(e) => handleFilter(column, e.target.value)}
                                />
                            </div>
                        ))}
                        <button className="clear-filters" onClick={clearFilters}>
                            Очистить фильтры
                        </button>
                    </div>

                    <div className="pagination-controls">
                        <div className="items-per-page">
                            <label>Строк на странице:</label>
                            <select 
                                value={itemsPerPage} 
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="report-table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                {columns.map(column => (
                                    <th 
                                        key={column}
                                        onClick={() => handleSort(column)}
                                        className={`sortable ${sortConfig.key === column ? 'sorted' : ''}`}
                                    >
                                        <div className="th-content">
                                            <span>{column}</span>
                                            <span className="sort-icon">{getSortIcon(column)}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.map((row, index) => (
                                <tr key={startIndex + index}>
                                    {columns.map(column => (
                                        <td key={column}>
                                            {row[column] || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {processedData.length === 0 && (
                    <div className="no-data">
                        <div className="no-data-icon">📊</div>
                        <h3>Нет данных для отображения</h3>
                        <p>Попробуйте изменить фильтры или поисковый запрос</p>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="pagination">
                        <button 
                            className="page-button"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            ← Предыдущая
                        </button>
                        
                        <div className="page-numbers">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button 
                            className="page-button"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Следующая →
                        </button>
                    </div>
                )}

                <div className="report-footer">
                    <p>
                        Показано {startIndex + 1}-{Math.min(endIndex, processedData.length)} из {processedData.length} записей
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportViewer;
