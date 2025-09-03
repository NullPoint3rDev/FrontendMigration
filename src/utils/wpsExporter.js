/* eslint-disable no-undef */
// Утилита для экспорта WPS в Excel формат
// Требует установки: npm install xlsx file-saver

// Функция для динамической загрузки библиотеки XLSX
const loadXLSX = async () => {
    try {
        // Пытаемся загрузить библиотеку динамически
        const XLSX = await import('xlsx');
        return XLSX.default || XLSX;
    } catch (error) {
        console.error('Не удалось загрузить библиотеку XLSX:', error);
        return null;
    }
};

export const exportWPSToExcel = async (wps) => {
    try {
        // Загружаем библиотеку XLSX
        const XLSX = await loadXLSX();
        
        if (!XLSX) {
            console.error('Библиотека XLSX не установлена. Установите: npm install xlsx file-saver');
            alert('Для экспорта в Excel необходимо установить библиотеку XLSX. Обратитесь к разработчику.');
            return false;
        }

        // Создаем данные для Excel
        const excelData = [
            ['Технологическая карта сварки (WPS)'],
            [''],
            ['Основная информация:'],
            ['Название', wps.name || ''],
            ['Описание', wps.description || ''],
            ['Метод сварки', wps.weldingMethod || ''],
            ['Тип материала', wps.materialType || ''],
            ['Толщина', wps.thickness || ''],
            [''],
            ['Параметры сварки:'],
            ['Минимальный ток (А)', wps.currentMin || ''],
            ['Максимальный ток (А)', wps.currentMax || ''],
            ['Минимальное напряжение (В)', wps.voltageMin || ''],
            ['Максимальное напряжение (В)', wps.voltageMax || ''],
            ['Скорость подачи', wps.feedRate || ''],
            ['Расход газа', wps.gasConsumption || ''],
            [''],
            ['Стандарты:'],
            ['ГОСТ', wps.gostStandard || ''],
            ['Статус', getStatusLabel(wps.status) || ''],
            [''],
            ['Дата создания', wps.dateCreated ? new Date(wps.dateCreated).toLocaleDateString('ru-RU') : ''],
            ['Дата обновления', wps.dateUpdated ? new Date(wps.dateUpdated).toLocaleDateString('ru-RU') : '']
        ];

        // Создаем рабочую книгу
        const workbook = XLSX.utils.book_new();
        
        // Создаем лист с данными
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);
        
        // Настраиваем ширину столбцов
        const columnWidths = [
            { wch: 30 }, // Первый столбец
            { wch: 40 }  // Второй столбец
        ];
        worksheet['!cols'] = columnWidths;
        
        // Добавляем лист в книгу
        XLSX.utils.book_append_sheet(workbook, worksheet, 'WPS_' + wps.name);
        
        // Генерируем имя файла
        const fileName = `WPS_${wps.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Скачиваем файл
        XLSX.writeFile(workbook, fileName);
        
        console.log('WPS успешно экспортирован в Excel:', fileName);
        return true;
        
    } catch (error) {
        console.error('Ошибка при экспорте WPS в Excel:', error);
        alert('Произошла ошибка при экспорте WPS в Excel: ' + error.message);
        return false;
    }
};

// Функция для получения читаемого статуса
const getStatusLabel = (status) => {
    switch (status) {
        case 'Active':
            return 'Активна';
        case 'Pending':
            return 'В ожидании';
        case 'Inactive':
            return 'Неактивна';
        case 'Blocked':
            return 'Заблокирована';
        case 'Deleted':
            return 'Удалена';
        default:
            return status || 'Неизвестно';
    }
};

// Альтернативная функция для экспорта в CSV (если XLSX недоступен)
export const exportWPSToCSV = (wps) => {
    try {
        const csvData = [
            'Технологическая карта сварки (WPS)',
            '',
            'Основная информация',
            'Название,' + (wps.name || ''),
            'Описание,' + (wps.description || ''),
            'Метод сварки,' + (wps.weldingMethod || ''),
            'Тип материала,' + (wps.materialType || ''),
            'Толщина,' + (wps.thickness || ''),
            '',
            'Параметры сварки',
            'Минимальный ток (А),' + (wps.currentMin || ''),
            'Максимальный ток (А),' + (wps.currentMax || ''),
            'Минимальное напряжение (В),' + (wps.voltageMin || ''),
            'Максимальное напряжение (В),' + (wps.voltageMax || ''),
            'Скорость подачи,' + (wps.feedRate || ''),
            'Расход газа,' + (wps.gasConsumption || ''),
            '',
            'Стандарты',
            'ГОСТ,' + (wps.gostStandard || ''),
            'Статус,' + getStatusLabel(wps.status),
            '',
            'Дата создания,' + (wps.dateCreated ? new Date(wps.dateCreated).toLocaleDateString('ru-RU') : ''),
            'Дата обновления,' + (wps.dateUpdated ? new Date(wps.dateUpdated).toLocaleDateString('ru-RU') : '')
        ].join('\n');

        // Создаем Blob и скачиваем
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `WPS_${wps.name}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('WPS успешно экспортирован в CSV');
        return true;
        
    } catch (error) {
        console.error('Ошибка при экспорте WPS в CSV:', error);
        alert('Произошла ошибка при экспорте WPS в CSV: ' + error.message);
        return false;
    }
};

// Функция для экспорта всех WPS в Excel
export const exportAllWPSToExcel = async (wpsList) => {
    try {
        // Загружаем библиотеку XLSX
        const XLSX = await loadXLSX();
        
        if (!XLSX) {
            console.error('Библиотека XLSX не установлена. Установите: npm install xlsx file-saver');
            alert('Для экспорта в Excel необходимо установить библиотеку XLSX. Обратитесь к разработчику.');
            return false;
        }

        // Создаем рабочую книгу
        const workbook = XLSX.utils.book_new();
        
        // Создаем лист с данными всех WPS
        const allWPSData = [
            ['Список всех технологических карт сварки (WPS)'],
            [''],
            ['Общее количество WPS:', wpsList.length],
            ['Дата экспорта:', new Date().toLocaleDateString('ru-RU')],
            [''],
            ['№', 'Название', 'Описание', 'Метод сварки', 'Материал', 'Толщина', 'Ток (А)', 'Напряжение (В)', 'Скорость подачи', 'Расход газа', 'ГОСТ', 'Статус']
        ];

        // Добавляем данные каждого WPS
        wpsList.forEach((wps, index) => {
            allWPSData.push([
                index + 1,
                wps.name || '',
                wps.description || '',
                wps.weldingMethod || '',
                wps.materialType || '',
                wps.thickness || '',
                `${wps.currentMin || ''}-${wps.currentMax || ''}`,
                `${wps.voltageMin || ''}-${wps.voltageMax || ''}`,
                wps.feedRate || '',
                wps.gasConsumption || '',
                wps.gostStandard || '',
                getStatusLabel(wps.status)
            ]);
        });

        // Создаем лист с данными
        const worksheet = XLSX.utils.aoa_to_sheet(allWPSData);
        
        // Настраиваем ширину столбцов
        const columnWidths = [
            { wch: 5 },   // №
            { wch: 25 },  // Название
            { wch: 30 },  // Описание
            { wch: 15 },  // Метод сварки
            { wch: 15 },  // Материал
            { wch: 10 },  // Толщина
            { wch: 15 },  // Ток
            { wch: 20 },  // Напряжение
            { wch: 15 },  // Скорость подачи
            { wch: 15 },  // Расход газа
            { wch: 20 },  // ГОСТ
            { wch: 15 }   // Статус
        ];
        worksheet['!cols'] = columnWidths;
        
        // Добавляем лист в книгу
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Все_WPS');
        
        // Генерируем имя файла
        const fileName = `Все_WPS_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Скачиваем файл
        XLSX.writeFile(workbook, fileName);
        
        console.log('Все WPS успешно экспортированы в Excel:', fileName);
        return true;
        
    } catch (error) {
        console.error('Ошибка при экспорте всех WPS в Excel:', error);
        alert('Произошла ошибка при экспорте всех WPS в Excel: ' + error.message);
        return false;
    }
};

// Функция для экспорта всех WPS в CSV
export const exportAllWPSToCSV = (wpsList) => {
    try {
        // Создаем заголовки CSV
        const csvData = [
            'Список всех технологических карт сварки (WPS)',
            '',
            'Общее количество WPS,' + wpsList.length,
            'Дата экспорта,' + new Date().toLocaleDateString('ru-RU'),
            '',
            '№,Название,Описание,Метод сварки,Материал,Толщина,Ток (А),Напряжение (В),Скорость подачи,Расход газа,ГОСТ,Статус'
        ];

        // Добавляем данные каждого WPS
        wpsList.forEach((wps, index) => {
            csvData.push([
                index + 1,
                wps.name || '',
                wps.description || '',
                wps.weldingMethod || '',
                wps.materialType || '',
                wps.thickness || '',
                `${wps.currentMin || ''}-${wps.currentMax || ''}`,
                `${wps.voltageMin || ''}-${wps.voltageMax || ''}`,
                wps.feedRate || '',
                wps.gasConsumption || '',
                wps.gostStandard || '',
                getStatusLabel(wps.status)
            ].join(','));
        });

        // Создаем Blob и скачиваем
        const blob = new Blob([csvData.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Все_WPS_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Все WPS успешно экспортированы в CSV');
        return true;
        
    } catch (error) {
        console.error('Ошибка при экспорте всех WPS в CSV:', error);
        alert('Произошла ошибка при экспорте всех WPS в CSV: ' + error.message);
        return false;
    }
};
