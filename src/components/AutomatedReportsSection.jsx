import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    IconButton,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Pagination,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControlLabel,
    Grid,
    Tooltip,
    Menu,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    MoreVert as MoreVertIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Schedule as ScheduleIcon,
    Refresh as RefreshIcon,
    Settings as SettingsIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import CreateAutomatedReportModal from './CreateAutomatedReportModal';
import './styles/automatedReportsSection.css';

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

    // Mock data for development
    const mockAutomatedReports = [
        {
            id: 1,
            name: 'Еженедельный отчет по оборудованию',
            templateId: 1,
            templateName: 'Отчет по работе оборудования',
            triggers: [
                { type: 'TIME', value: 'weekly', description: 'Каждую неделю в понедельник в 09:00', time: '09:00', daysOfWeek: 'MONDAY' }
            ],
            status: 'ACTIVE',
            lastRun: new Date('2024-01-15T09:00:00'),
            nextRun: new Date('2024-01-22T09:00:00'),
            createdAt: new Date('2024-01-01T10:00:00'),
            createdBy: 'Администратор'
        },
        {
            id: 2,
            name: 'Ежедневный отчет по сварщикам',
            templateId: 2,
            templateName: 'Отчет по работе сварщиков',
            triggers: [
                { type: 'TIME', value: 'daily', description: 'Каждый день в 18:00', time: '18:00' }
            ],
            status: 'ACTIVE',
            lastRun: new Date('2024-01-15T18:00:00'),
            nextRun: new Date('2024-01-16T18:00:00'),
            createdAt: new Date('2024-01-05T14:30:00'),
            createdBy: 'Менеджер'
        },
        {
            id: 3,
            name: 'Отчет при ошибках оборудования',
            templateId: 3,
            templateName: 'Отчет по ошибкам оборудования',
            triggers: [
                { type: 'EQUIPMENT_ERROR', value: 'threshold', description: 'При превышении 5 ошибок в час' }
            ],
            status: 'INACTIVE',
            lastRun: null,
            nextRun: null,
            createdAt: new Date('2024-01-10T11:20:00'),
            createdBy: 'Техник'
        },
        {
            id: 4,
            name: 'Месячный отчет по материалам',
            templateId: 4,
            templateName: 'Отчет по расходу материалов',
            triggers: [
                { type: 'TIME', value: 'monthly', description: 'Каждый месяц 1 числа в 08:00', time: '08:00', dayOfMonth: 1 }
            ],
            status: 'ACTIVE',
            lastRun: new Date('2024-01-01T08:00:00'),
            nextRun: new Date('2024-02-01T08:00:00'),
            createdAt: new Date('2023-12-15T16:45:00'),
            createdBy: 'Администратор'
        },
        {
            id: 5,
            name: 'Рабочие дни отчет по сварщикам',
            templateId: 2,
            templateName: 'Отчет по работе сварщиков',
            triggers: [
                { type: 'TIME', value: 'weekly', description: 'Каждую неделю в понедельник, среду, пятницу в 07:00', time: '07:00', daysOfWeek: 'MONDAY,WEDNESDAY,FRIDAY' }
            ],
            status: 'ACTIVE',
            lastRun: new Date('2024-01-15T07:00:00'),
            nextRun: new Date('2024-01-17T07:00:00'),
            createdAt: new Date('2024-01-10T12:00:00'),
            createdBy: 'Менеджер'
        }
    ];

    useEffect(() => {
        loadAutomatedReports();
    }, []);

    useEffect(() => {
        filterReports();
    }, [automatedReports, searchTerm, statusFilter]);

    const loadAutomatedReports = async () => {
        setLoading(true);
        try {
            // В реальном приложении здесь будет вызов API
            // const data = await getAutomatedReports();
            // setAutomatedReports(data);
            
            // Пока используем mock данные
            setAutomatedReports(mockAutomatedReports);
        } catch (err) {
            setError('Ошибка при загрузке автоматизированных отчетов');
            console.error('Error loading automated reports:', err);
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
            // В реальном приложении здесь будет вызов API
            // await toggleAutomatedReportStatus(reportId);
            
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
            console.error('Error toggling report status:', err);
        }
    };

    const handleDelete = async (reportId) => {
        try {
            // В реальном приложении здесь будет вызов API
            // await deleteAutomatedReport(reportId);
            
            setAutomatedReports(prev =>
                prev.filter(report => report.id !== reportId)
            );
            setDeleteDialogOpen(false);
            setReportToDelete(null);
        } catch (err) {
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

    const getStatusColor = (status) => {
        return status === 'ACTIVE' ? 'success' : 'default';
    };

    const getStatusLabel = (status) => {
        return status === 'ACTIVE' ? 'Активен' : 'Неактивен';
    };

    const getTriggerIcon = (triggerType) => {
        switch (triggerType) {
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

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box className="automated-reports-section">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" component="h2" fontWeight="bold">
                    Автоматизированные отчеты
                </Typography>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAutomatedReports}
                        disabled={loading}
                    >
                        Обновить
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateModalOpen(true)}
                    >
                        Создать отчет
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Фильтры и поиск */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                        <TextField
                            placeholder="Поиск автоматизированных отчетов..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 300 }}
                        />
                        
                        <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel>Статус</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Статус"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="all">Все</MenuItem>
                                <MenuItem value="ACTIVE">Активные</MenuItem>
                                <MenuItem value="INACTIVE">Неактивные</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </CardContent>
            </Card>

            {/* Список автоматизированных отчетов */}
            {paginatedReports.length === 0 ? (
                <Card>
                    <CardContent>
                        <Box textAlign="center" py={4}>
                            <Typography variant="h6" color="text.secondary">
                                Автоматизированные отчеты не найдены
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Создайте первый автоматизированный отчет для автоматической генерации отчетов
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateModalOpen(true)}
                            >
                                Создать отчет
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {paginatedReports.map((report) => (
                        <Card key={report.id} sx={{ mb: 2 }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                    <Box flex={1}>
                                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                                            <Chip
                                                label={getStatusLabel(report.status)}
                                                color={getStatusColor(report.status)}
                                                size="small"
                                            />
                                        </Box>
                                        
                                        <Typography variant="h6" component="h3" gutterBottom>
                                            {report.name}
                                        </Typography>
                                        
                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            Шаблон: {report.templateName}
                                        </Typography>

                                        <Grid container spacing={2} mb={2}>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Триггеры:</strong>
                                                </Typography>
                                                {report.triggers.map((trigger, index) => (
                                                    <Box key={index} display="flex" alignItems="center" gap={1} mt={0.5}>
                                                        {getTriggerIcon(trigger.type)}
                                                        <Typography variant="caption">
                                                            {trigger.description}
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Последний запуск:</strong> {report.lastRun ? format(report.lastRun, 'dd.MM.yyyy HH:mm', { locale: ru }) : 'Никогда'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Следующий запуск:</strong> {report.nextRun ? format(report.nextRun, 'dd.MM.yyyy HH:mm', { locale: ru }) : 'Не запланирован'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                        
                                        <Typography variant="caption" color="text.secondary">
                                            Создан: {format(report.createdAt, 'dd.MM.yyyy HH:mm', { locale: ru })} пользователем {report.createdBy}
                                        </Typography>
                                    </Box>
                                    
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={report.status === 'ACTIVE'}
                                                    onChange={() => handleToggleStatus(report.id)}
                                                    color="primary"
                                                />
                                            }
                                            label=""
                                        />
                                        <IconButton
                                            onClick={(e) => handleMenuOpen(e, report)}
                                            size="small"
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Пагинация */}
                    {filteredReports.length > itemsPerPage && (
                        <Box display="flex" justifyContent="center" mt={3}>
                            <Pagination
                                count={Math.ceil(filteredReports.length / itemsPerPage)}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </Box>
                    )}
                </>
            )}

            {/* Контекстное меню */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => {
                    // TODO: Implement edit functionality
                    handleMenuClose();
                }}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Редактировать</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    setReportToDelete(selectedReport);
                    setDeleteDialogOpen(true);
                    handleMenuClose();
                }}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Удалить</ListItemText>
                </MenuItem>
            </Menu>

            {/* Диалог подтверждения удаления */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Подтверждение удаления</DialogTitle>
                <DialogContent>
                    <Typography>
                        Вы уверены, что хотите удалить автоматизированный отчет "{reportToDelete?.name}"?
                        Это действие нельзя отменить.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        Отмена
                    </Button>
                    <Button 
                        onClick={() => handleDelete(reportToDelete?.id)} 
                        color="error"
                        variant="contained"
                    >
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Модальное окно создания автоматизированного отчета */}
            <CreateAutomatedReportModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSave={(newReport) => {
                    setAutomatedReports(prev => [newReport, ...prev]);
                    setCreateModalOpen(false);
                }}
            />
        </Box>
    );
};

export default AutomatedReportsSection;
