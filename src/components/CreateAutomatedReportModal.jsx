import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Typography,
    Box,
    Chip,
    IconButton,
    Alert,
    Divider,
    FormControlLabel,
    Switch,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import { reportApi } from '../api/reportApi';
import '../styles/createAutomatedReportModal.css';

const CreateAutomatedReportModal = ({ open, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        templateId: '',
        templateName: '',
        triggers: [],
        isActive: true
    });
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [triggerType, setTriggerType] = useState('TIME');
    const [triggerValue, setTriggerValue] = useState('');
    const [triggerDescription, setTriggerDescription] = useState('');
    const [triggerTime, setTriggerTime] = useState('09:00');
    const [triggerDays, setTriggerDays] = useState([]);
    const [triggerDayOfMonth, setTriggerDayOfMonth] = useState(1);


    useEffect(() => {
        if (open) {
            loadTemplates();
            resetForm();
        }
    }, [open]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            // Загружаем шаблоны пользователя из localStorage
            const savedTemplates = localStorage.getItem('reportTemplates');
            if (savedTemplates) {
                const userTemplates = JSON.parse(savedTemplates);
                // Преобразуем шаблоны в формат, ожидаемый компонентом
                const formattedTemplates = userTemplates.map(template => ({
                    id: template.id,
                    name: template.name,
                    type: template.reportType
                }));
                setTemplates(formattedTemplates);
            } else {
                setTemplates([]);
            }
        } catch (err) {
            setError('Ошибка при загрузке шаблонов отчетов');
            console.error('Error loading templates:', err);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            templateId: '',
            templateName: '',
            triggers: [],
            isActive: true
        });
        setTriggerType('TIME');
        setTriggerValue('');
        setTriggerDescription('');
        setTriggerTime('09:00');
        setTriggerDays([]);
        setTriggerDayOfMonth(1);
        setError(null);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleTemplateChange = (templateId) => {
        const template = templates.find(t => t.id === templateId);
        setFormData(prev => ({
            ...prev,
            templateId: templateId,
            templateName: template ? template.name : ''
        }));
    };

    const addTrigger = () => {
        if (!triggerValue || !triggerDescription) {
            setError('Заполните все поля триггера');
            return;
        }

        // Для временных триггеров проверяем дополнительные поля
        if (triggerType === 'TIME') {
            if (!triggerTime) {
                setError('Укажите время выполнения');
                return;
            }
            if (triggerValue === 'weekly' && triggerDays.length === 0) {
                setError('Выберите дни недели для еженедельного выполнения');
                return;
            }
            if (triggerValue === 'monthly' && !triggerDayOfMonth) {
                setError('Укажите день месяца для ежемесячного выполнения');
                return;
            }
        }

        const newTrigger = {
            type: triggerType,
            value: triggerValue,
            description: triggerDescription,
            time: triggerType === 'TIME' ? triggerTime : undefined,
            daysOfWeek: triggerType === 'TIME' && triggerValue === 'weekly' ? triggerDays.join(',') : undefined,
            dayOfMonth: triggerType === 'TIME' && triggerValue === 'monthly' ? triggerDayOfMonth : undefined
        };

        setFormData(prev => ({
            ...prev,
            triggers: [...prev.triggers, newTrigger]
        }));

        setTriggerValue('');
        setTriggerDescription('');
        setTriggerTime('09:00');
        setTriggerDays([]);
        setTriggerDayOfMonth(1);
    };

    const removeTrigger = (index) => {
        setFormData(prev => ({
            ...prev,
            triggers: prev.triggers.filter((_, i) => i !== index)
        }));
    };

    const getTriggerIcon = (type) => {
        switch (type) {
            case 'TIME':
                return <ScheduleIcon />;
            case 'EQUIPMENT_ERROR':
                return <WarningIcon />;
            case 'VALUE_THRESHOLD':
                return <CheckCircleIcon />;
            default:
                return <SettingsIcon />;
        }
    };

    const getTriggerTypeOptions = () => {
        return [
            { value: 'TIME', label: 'По времени' },
            { value: 'EQUIPMENT_ERROR', label: 'По ошибкам оборудования' },
            { value: 'VALUE_THRESHOLD', label: 'По значениям параметров' }
        ];
    };

    const getTimeOptions = () => {
        return [
            { value: 'daily', label: 'Ежедневно' },
            { value: 'weekly', label: 'Еженедельно' },
            { value: 'monthly', label: 'Ежемесячно' }
        ];
    };

    const getDaysOfWeekOptions = () => {
        return [
            { value: 'MONDAY', label: 'Понедельник' },
            { value: 'TUESDAY', label: 'Вторник' },
            { value: 'WEDNESDAY', label: 'Среда' },
            { value: 'THURSDAY', label: 'Четверг' },
            { value: 'FRIDAY', label: 'Пятница' },
            { value: 'SATURDAY', label: 'Суббота' },
            { value: 'SUNDAY', label: 'Воскресенье' }
        ];
    };

    const handleDayToggle = (day) => {
        setTriggerDays(prev => {
            if (prev.includes(day)) {
                return prev.filter(d => d !== day);
            } else {
                return [...prev, day];
            }
        });
    };

    const generateTimeTriggerDescription = () => {
        if (triggerType !== 'TIME' || !triggerValue || !triggerTime) {
            return '';
        }

        const timeStr = triggerTime;
        
        switch (triggerValue) {
            case 'daily':
                return `Каждый день в ${timeStr}`;
            case 'weekly':
                if (triggerDays.length === 0) {
                    return `Еженедельно в ${timeStr}`;
                }
                const dayNames = triggerDays.map(day => {
                    const option = getDaysOfWeekOptions().find(opt => opt.value === day);
                    return option ? option.label : day;
                });
                return `Каждую неделю в ${dayNames.join(', ')} в ${timeStr}`;
            case 'monthly':
                return `Каждый месяц ${triggerDayOfMonth} числа в ${timeStr}`;
            default:
                return `В ${timeStr}`;
        }
    };

    const getEquipmentErrorOptions = () => {
        return [
            { value: 'threshold', label: 'При превышении порога ошибок' },
            { value: 'critical', label: 'При критических ошибках' },
            { value: 'any', label: 'При любой ошибке' }
        ];
    };

    const getValueThresholdOptions = () => {
        return [
            { value: 'temperature', label: 'Температура' },
            { value: 'current', label: 'Сила тока' },
            { value: 'voltage', label: 'Напряжение' },
            { value: 'power', label: 'Мощность' }
        ];
    };

    const getTriggerValueOptions = () => {
        switch (triggerType) {
            case 'TIME':
                return getTimeOptions();
            case 'EQUIPMENT_ERROR':
                return getEquipmentErrorOptions();
            case 'VALUE_THRESHOLD':
                return getValueThresholdOptions();
            default:
                return [];
        }
    };

    const handleSave = () => {
        if (!formData.name || !formData.templateId || formData.triggers.length === 0) {
            setError('Заполните все обязательные поля');
            return;
        }

        const newReport = {
            id: Date.now(), // Временный ID для mock данных
            name: formData.name,
            templateId: formData.templateId,
            templateName: formData.templateName,
            triggers: formData.triggers,
            status: formData.isActive ? 'ACTIVE' : 'INACTIVE',
            lastRun: null,
            nextRun: formData.isActive ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
            createdAt: new Date(),
            createdBy: 'Текущий пользователь'
        };

        onSave(newReport);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            className="create-automated-report-modal"
        >
            <DialogTitle>
                <Typography variant="h6" component="div" fontWeight="bold">
                    Создать автоматизированный отчет
                </Typography>
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={3}>
                    {/* Основная информация */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Основная информация
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Название автоматизированного отчета"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="Например: Еженедельный отчет по оборудованию"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth required>
                                    <InputLabel>Шаблон отчета</InputLabel>
                                    <Select
                                        value={formData.templateId}
                                        label="Шаблон отчета"
                                        onChange={(e) => handleTemplateChange(e.target.value)}
                                    >
                                        {templates.map((template) => (
                                            <MenuItem key={template.id} value={template.id}>
                                                {template.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.isActive}
                                            onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label="Активировать автоматический отчет сразу после создания"
                                />
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider />
                    </Grid>

                    {/* Триггеры */}
                    <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                            Триггеры запуска
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Настройте условия, при которых будет автоматически создаваться отчет
                        </Typography>

                        {/* Добавление нового триггера */}
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle1">
                                    Добавить триггер
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <FormControl fullWidth>
                                            <InputLabel>Тип триггера</InputLabel>
                                            <Select
                                                value={triggerType}
                                                label="Тип триггера"
                                                onChange={(e) => setTriggerType(e.target.value)}
                                            >
                                                {getTriggerTypeOptions().map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            {getTriggerIcon(option.value)}
                                                            {option.label}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <FormControl fullWidth>
                                            <InputLabel>Значение</InputLabel>
                                            <Select
                                                value={triggerValue}
                                                label="Значение"
                                                onChange={(e) => setTriggerValue(e.target.value)}
                                            >
                                                {getTriggerValueOptions().map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    
                                    {/* Дополнительные поля для временных триггеров */}
                                    {triggerType === 'TIME' && (
                                        <>
                                            <Grid item xs={12} md={4}>
                                                <TextField
                                                    fullWidth
                                                    label="Время выполнения"
                                                    type="time"
                                                    value={triggerTime}
                                                    onChange={(e) => setTriggerTime(e.target.value)}
                                                    InputLabelProps={{
                                                        shrink: true,
                                                    }}
                                                />
                                            </Grid>
                                            
                                            {triggerValue === 'weekly' && (
                                                <Grid item xs={12}>
                                                    <Typography variant="subtitle2" gutterBottom>
                                                        Дни недели:
                                                    </Typography>
                                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                                        {getDaysOfWeekOptions().map((day) => (
                                                            <Chip
                                                                key={day.value}
                                                                label={day.label}
                                                                onClick={() => handleDayToggle(day.value)}
                                                                color={triggerDays.includes(day.value) ? "primary" : "default"}
                                                                variant={triggerDays.includes(day.value) ? "filled" : "outlined"}
                                                            />
                                                        ))}
                                                    </Box>
                                                </Grid>
                                            )}
                                            
                                            {triggerValue === 'monthly' && (
                                                <Grid item xs={12} md={4}>
                                                    <TextField
                                                        fullWidth
                                                        label="День месяца"
                                                        type="number"
                                                        value={triggerDayOfMonth}
                                                        onChange={(e) => setTriggerDayOfMonth(parseInt(e.target.value) || 1)}
                                                        inputProps={{
                                                            min: 1,
                                                            max: 31
                                                        }}
                                                    />
                                                </Grid>
                                            )}
                                        </>
                                    )}
                                    
                                    <Grid item xs={12} md={triggerType === 'TIME' ? 12 : 4}>
                                        <TextField
                                            fullWidth
                                            label="Описание"
                                            value={triggerDescription || generateTimeTriggerDescription()}
                                            onChange={(e) => setTriggerDescription(e.target.value)}
                                            placeholder="Например: Каждую неделю в понедельник в 09:00"
                                            disabled={triggerType === 'TIME' && !!generateTimeTriggerDescription()}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            onClick={addTrigger}
                                            disabled={
                                                !triggerValue || 
                                                (triggerType === 'TIME' && !triggerTime) ||
                                                (triggerType === 'TIME' && triggerValue === 'weekly' && triggerDays.length === 0) ||
                                                (triggerType === 'TIME' && triggerValue === 'monthly' && !triggerDayOfMonth)
                                            }
                                        >
                                            Добавить триггер
                                        </Button>
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>

                        {/* Список добавленных триггеров */}
                        {formData.triggers.length > 0 && (
                            <Box mt={2}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Добавленные триггеры:
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={1}>
                                    {formData.triggers.map((trigger, index) => (
                                        <Chip
                                            key={index}
                                            icon={getTriggerIcon(trigger.type)}
                                            label={trigger.description}
                                            onDelete={() => removeTrigger(index)}
                                            deleteIcon={<DeleteIcon />}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    Отмена
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={!formData.name || !formData.templateId || formData.triggers.length === 0}
                >
                    Создать отчет
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateAutomatedReportModal;
