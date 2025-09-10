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
    Tooltip,
    Menu,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    MoreVert as MoreVertIcon,
    MarkEmailRead as MarkReadIcon,
    Delete as DeleteIcon,
    Refresh as RefreshIcon,
    NotificationsActive as ActiveIcon,
    NotificationsOff as InactiveIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getUserNotifications, markNotificationAsRead, deleteNotification } from '../api/notificationApi';
import './styles/notificationsSection.css';

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

    // Mock data for development
    const mockNotifications = [
        {
            id: 1,
            title: 'Отчет успешно создан',
            content: 'Отчет по работе оборудования за период 01.01.2024 - 31.01.2024 был успешно сгенерирован и сохранен.',
            type: 'SUCCESS',
            status: 'UNREAD',
            createdAt: new Date('2024-01-15T10:30:00'),
            userAccountId: 1
        },
        {
            id: 2,
            title: 'Ошибка при создании отчета',
            content: 'Не удалось создать отчет по сварщикам. Проверьте настройки и попробуйте снова.',
            type: 'ERROR',
            status: 'UNREAD',
            createdAt: new Date('2024-01-15T09:15:00'),
            userAccountId: 1
        },
        {
            id: 3,
            title: 'Автоматический отчет готов',
            content: 'Еженедельный отчет по расходу материалов готов к просмотру.',
            type: 'INFO',
            status: 'READ',
            createdAt: new Date('2024-01-14T16:45:00'),
            userAccountId: 1
        },
        {
            id: 4,
            title: 'Системное уведомление',
            content: 'Обновление системы запланировано на 20.01.2024 в 02:00. Система будет недоступна в течение 30 минут.',
            type: 'SYSTEM',
            status: 'READ',
            createdAt: new Date('2024-01-13T14:20:00'),
            userAccountId: 1
        },
        {
            id: 5,
            title: 'Превышение лимита ошибок',
            content: 'Обнаружено превышение допустимого количества ошибок на сварочном аппарате №3.',
            type: 'WARNING',
            status: 'UNREAD',
            createdAt: new Date('2024-01-12T11:30:00'),
            userAccountId: 1
        }
    ];

    useEffect(() => {
        loadNotifications();
    }, []);

    useEffect(() => {
        filterNotifications();
    }, [notifications, searchTerm, statusFilter, typeFilter]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            // В реальном приложении здесь будет вызов API
            // const userId = JSON.parse(localStorage.getItem('user')).id;
            // const data = await getUserNotifications(userId);
            // setNotifications(data);
            
            // Пока используем mock данные
            setNotifications(mockNotifications);
        } catch (err) {
            setError('Ошибка при загрузке уведомлений');
            console.error('Error loading notifications:', err);
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

    const getTypeColor = (type) => {
        const colors = {
            SUCCESS: 'success',
            ERROR: 'error',
            WARNING: 'warning',
            INFO: 'info',
            SYSTEM: 'default'
        };
        return colors[type] || 'default';
    };

    const getTypeLabel = (type) => {
        const labels = {
            SUCCESS: 'Успех',
            ERROR: 'Ошибка',
            WARNING: 'Предупреждение',
            INFO: 'Информация',
            SYSTEM: 'Система'
        };
        return labels[type] || type;
    };

    const getStatusIcon = (status) => {
        return status === 'UNREAD' ? <ActiveIcon /> : <InactiveIcon />;
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box className="notifications-section">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" component="h2" fontWeight="bold">
                    Уведомления
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadNotifications}
                    disabled={loading}
                >
                    Обновить
                </Button>
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
                            placeholder="Поиск уведомлений..."
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
                                <MenuItem value="UNREAD">Непрочитанные</MenuItem>
                                <MenuItem value="READ">Прочитанные</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel>Тип</InputLabel>
                            <Select
                                value={typeFilter}
                                label="Тип"
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <MenuItem value="all">Все</MenuItem>
                                <MenuItem value="SUCCESS">Успех</MenuItem>
                                <MenuItem value="ERROR">Ошибка</MenuItem>
                                <MenuItem value="WARNING">Предупреждение</MenuItem>
                                <MenuItem value="INFO">Информация</MenuItem>
                                <MenuItem value="SYSTEM">Система</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </CardContent>
            </Card>

            {/* Список уведомлений */}
            {paginatedNotifications.length === 0 ? (
                <Card>
                    <CardContent>
                        <Box textAlign="center" py={4}>
                            <Typography variant="h6" color="text.secondary">
                                Уведомления не найдены
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Попробуйте изменить фильтры или поисковый запрос
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {paginatedNotifications.map((notification) => (
                        <Card
                            key={notification.id}
                            sx={{
                                mb: 2,
                                borderLeft: notification.status === 'UNREAD' ? '4px solid #1976d2' : '4px solid transparent',
                                opacity: notification.status === 'READ' ? 0.8 : 1
                            }}
                        >
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                    <Box flex={1}>
                                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                                            <Chip
                                                label={getTypeLabel(notification.type)}
                                                color={getTypeColor(notification.type)}
                                                size="small"
                                            />
                                            <Chip
                                                icon={getStatusIcon(notification.status)}
                                                label={notification.status === 'UNREAD' ? 'Новое' : 'Прочитано'}
                                                variant={notification.status === 'UNREAD' ? 'filled' : 'outlined'}
                                                size="small"
                                            />
                                        </Box>
                                        
                                        <Typography variant="h6" component="h3" gutterBottom>
                                            {notification.title}
                                        </Typography>
                                        
                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            {notification.content}
                                        </Typography>
                                        
                                        <Typography variant="caption" color="text.secondary">
                                            {format(notification.createdAt, 'dd.MM.yyyy HH:mm', { locale: ru })}
                                        </Typography>
                                    </Box>
                                    
                                    <IconButton
                                        onClick={(e) => handleMenuOpen(e, notification)}
                                        size="small"
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Пагинация */}
                    {filteredNotifications.length > itemsPerPage && (
                        <Box display="flex" justifyContent="center" mt={3}>
                            <Pagination
                                count={Math.ceil(filteredNotifications.length / itemsPerPage)}
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
                {selectedNotification?.status === 'UNREAD' && (
                    <MenuItem onClick={() => {
                        handleMarkAsRead(selectedNotification.id);
                        handleMenuClose();
                    }}>
                        <ListItemIcon>
                            <MarkReadIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Отметить как прочитанное</ListItemText>
                    </MenuItem>
                )}
                <MenuItem onClick={() => {
                    handleDelete(selectedNotification.id);
                    handleMenuClose();
                }}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Удалить</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default NotificationsSection;
