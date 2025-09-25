import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import '../styles/reportViewer.css';

const ReportViewer = ({ data, template, onClose }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Маппинг между названиями столбцов в шаблоне и полями в данных
    const columnMapping = {
        'Сварщик': { field: 'welderName', header: 'Сварщик' },
        'Режим': { field: 'weldingMode', header: 'Режим' },
        'Сила тока': { field: 'current', header: 'Сила тока, А' },
        'Масса проволоки': { field: 'wireConsumption', header: 'Масса проволоки, кг' },
        'Напряжение': { field: 'voltage', header: 'Напряжение, V' },
        'Проволока': { field: 'wireFeedRate', header: 'Проволока, м/мин' },
        'Газ л/мин': { field: 'gasFlow', header: 'Газ, л/мин' },
        'Время сварки (с)': { field: 'weldingTime', header: 'Время сварки (с)' }
    };

    // Получаем столбцы из шаблона с защитой от undefined
    const selectedColumns = template?.columns || [];
    
    // Отладочная информация
    console.log('Selected columns from template:', selectedColumns);
    console.log('Column mapping:', columnMapping);
    
    // Создаем массив столбцов для отображения
    const mappedColumns = selectedColumns.map(col => {
        const mapping = columnMapping[col];
        if (mapping) {
            return { ...mapping, key: mapping.field };
        } else {
            console.warn(`No mapping found for column: ${col}`);
            return null;
        }
    }).filter(Boolean);
    
    console.log('Mapped columns:', mappedColumns);
    
    const columns = [
        { field: 'startTime', header: 'Дата', type: 'date', key: 'date' },
        { field: 'startTime', header: 'Время', type: 'time', key: 'time' },
        ...mappedColumns
    ];
    
    console.log('Final columns array:', columns);
    
    // Сортировка данных - всегда вызываем useMemo
    const processedData = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return [];
        let sorted = [...data];

        // Применяем сортировку
        if (sortConfig.key) {
            sorted.sort((a, b) => {
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

        return sorted;
    }, [data, sortConfig]);

    // Проверка на пустые данные после всех хуков
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="report-viewer-overlay" onClick={onClose}>
                <div className="report-viewer" onClick={(e) => e.stopPropagation()}>
                    <div className="report-viewer-header">
                        <div className="report-title-section">
                            <h2>{template?.name || 'Отчет'}</h2>
                        </div>
                        <div className="report-actions">
                            <button className="close-button" onClick={onClose}>✕</button>
                        </div>
                    </div>
                    <div className="no-data">
                        <div className="no-data-icon">📊</div>
                        <h3>Нет данных для отображения</h3>
                    </div>
                </div>
            </div>
        );
    }

    const handleSort = (column) => {
        setSortConfig(prev => ({
            key: column.field,
            direction: prev.key === column.field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const exportToCSV = () => {
        const csvContent = [
            columns.map(col => col.header).join(','),
            ...processedData.map(row => 
                columns.map(column => {
                    let value = row[column.field];
                    if (column.type === 'date' && value) {
                        value = new Date(value).toLocaleDateString();
                    } else if (column.type === 'time' && value) {
                        value = new Date(value).toLocaleTimeString();
                    }
                    return `"${value || ''}"`;
                }).join(',')
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
        // Создаем настоящий XLSX файл
        const worksheet = XLSX.utils.json_to_sheet(processedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет');
        
        // Генерируем файл
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${template.name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSortIcon = (column) => {
        if (sortConfig.key !== column.field) return '↕️';
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
                        <button className="close-button" onClick={onClose}>
                            ✕
                        </button>
                    </div>
                </div>

                <div className="report-table-container">
                    <table className="report-table">
                        <thead>
                            <tr>
                                {columns.map(column => (
                                    <th 
                                        key={column.key}
                                        onClick={() => handleSort(column)}
                                        className={`sortable ${sortConfig.key === column.field ? 'sorted' : ''}`}
                                    >
                                        <div className="th-content">
                                            <span>{column.header}</span>
                                            <span className="sort-icon">{getSortIcon(column)}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((row, index) => (
                                <tr key={index}>
                                    {columns.map(column => (
                                        <td key={column.key}>
                                            {(() => {
                                                let value = row[column.field];
                                                if (column.type === 'date' && value) {
                                                    return new Date(value).toLocaleDateString();
                                                } else if (column.type === 'time' && value) {
                                                    return new Date(value).toLocaleTimeString();
                                                }
                                                return value || '-';
                                            })()}
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportViewer;
