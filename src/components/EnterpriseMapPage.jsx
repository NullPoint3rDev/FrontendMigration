import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    IconButton,
    Box,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    Zoom
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Settings as SettingsIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon
} from '@mui/icons-material';

const EnterpriseMapPage = () => {
    const [equipment, setEquipment] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [viewMode, setViewMode] = useState('map'); // 'map' или 'list'
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadEquipment();
    }, []);

    const loadEquipment = async () => {
        try {
            // TODO: Заменить на реальный API вызов
            const mockData = [
                {
                    id: 1,
                    name: 'Сварочный аппарат МС-500',
                    type: 'welding_machine',
                    location: { x: 100, y: 150, floor: 1, zone: 'Цех №1' },
                    status: 'active',
                    lastActivity: '2024-01-15 14:30:00',
                    operator: 'Иванов И.И.',
                    department: 'Сварочный участок',
                    coordinates: { x: 100, y: 150 }
                },
                {
                    id: 2,
                    name: 'Сварочный аппарат МС-350',
                    type: 'welding_machine',
                    location: { x: 300, y: 200, floor: 1, zone: 'Цех №1' },
                    status: 'maintenance',
                    lastActivity: '2024-01-15 13:45:00',
                    operator: 'Петров П.П.',
                    department: 'Сварочный участок',
                    coordinates: { x: 300, y: 200 }
                },
                {
                    id: 3,
                    name: 'Мониторинг-блок МС-1001',
                    type: 'monitoring_block',
                    location: { x: 200, y: 100, floor: 1, zone: 'Цех №1' },
                    status: 'active',
                    lastActivity: '2024-01-15 14:25:00',
                    operator: null,
                    department: 'ИТ отдел',
                    coordinates: { x: 200, y: 100 }
                },
                {
                    id: 4,
                    name: 'Сварочный аппарат МС-501 MX',
                    type: 'welding_machine',
                    location: { x: 400, y: 300, floor: 2, zone: 'Цех №2' },
                    status: 'error',
                    lastActivity: '2024-01-15 12:15:00',
                    operator: 'Сидоров С.С.',
                    department: 'Сварочный участок',
                    coordinates: { x: 400, y: 300 }
                }
            ];
            setEquipment(mockData);
        } catch (error) {
            console.error('Ошибка загрузки оборудования:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'maintenance':
                return 'warning';
            case 'error':
                return 'error';
            case 'inactive':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active':
                return <CheckCircleIcon />;
            case 'maintenance':
                return <WarningIcon />;
            case 'error':
                return <ErrorIcon />;
            default:
                return <LocationIcon />;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return 'Активен';
            case 'maintenance':
                return 'Обслуживание';
            case 'error':
                return 'Ошибка';
            case 'inactive':
                return 'Неактивен';
            default:
                return 'Неизвестно';
        }
    };

    const getEquipmentTypeLabel = (type) => {
        switch (type) {
            case 'welding_machine':
                return 'Сварочный аппарат';
            case 'monitoring_block':
                return 'Блок мониторинга';
            default:
                return 'Оборудование';
        }
    };

    const handleEquipmentClick = (equipmentItem) => {
        setSelectedEquipment(equipmentItem);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedEquipment(null);
    };

    const filteredEquipment = equipment.filter(item => {
        if (filterStatus === 'all') return true;
        return item.status === filterStatus;
    });

    const MapView = () => (
        <Paper sx={{ p: 3, height: '600px', position: 'relative', overflow: 'hidden' }}>
            <Typography variant="h6" gutterBottom>
                Карта предприятия
            </Typography>
            
            {/* Сетка карты */}
            <Box sx={{ 
                width: '100%', 
                height: '500px', 
                background: 'linear-gradient(90deg, #f0f0f0 1px, transparent 1px), linear-gradient(#f0f0f0 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                position: 'relative',
                border: '1px solid #ddd'
            }}>
                {/* Зоны */}
                <Box sx={{
                    position: 'absolute',
                    top: 50,
                    left: 50,
                    width: 200,
                    height: 150,
                    border: '2px solid #1976d2',
                    borderRadius: 1,
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Typography variant="body2" fontWeight="bold">Цех №1</Typography>
                </Box>
                
                <Box sx={{
                    position: 'absolute',
                    top: 250,
                    left: 350,
                    width: 200,
                    height: 150,
                    border: '2px solid #1976d2',
                    borderRadius: 1,
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Typography variant="body2" fontWeight="bold">Цех №2</Typography>
                </Box>

                {/* Оборудование на карте */}
                {filteredEquipment.map((item) => (
                    <Tooltip
                        key={item.id}
                        title={`${item.name} - ${getStatusLabel(item.status)}`}
                        arrow
                    >
                        <IconButton
                            sx={{
                                position: 'absolute',
                                left: item.coordinates.x,
                                top: item.coordinates.y,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: 'white',
                                border: '2px solid',
                                borderColor: getStatusColor(item.status) === 'success' ? '#4caf50' : 
                                            getStatusColor(item.status) === 'warning' ? '#ff9800' : 
                                            getStatusColor(item.status) === 'error' ? '#f44336' : '#9e9e9e',
                                '&:hover': {
                                    backgroundColor: 'white',
                                    transform: 'translate(-50%, -50%) scale(1.1)',
                                }
                            }}
                            onClick={() => handleEquipmentClick(item)}
                        >
                            {getStatusIcon(item.status)}
                        </IconButton>
                    </Tooltip>
                ))}
            </Box>
        </Paper>
    );

    const ListView = () => (
        <Grid container spacing={2}>
            {filteredEquipment.map((item) => (
                <Grid item xs={12} md={6} lg={4} key={item.id}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                {getStatusIcon(item.status)}
                                <Typography variant="h6" ml={1}>
                                    {item.name}
                                </Typography>
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {getEquipmentTypeLabel(item.type)}
                            </Typography>
                            
                            <Typography variant="body2">
                                <strong>Расположение:</strong> {item.location.zone}, этаж {item.location.floor}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Отдел:</strong> {item.department}
                            </Typography>
                            {item.operator && (
                                <Typography variant="body2">
                                    <strong>Оператор:</strong> {item.operator}
                                </Typography>
                            )}
                            <Typography variant="body2">
                                <strong>Последняя активность:</strong> {item.lastActivity}
                            </Typography>
                            
                            <Box mt={2}>
                                <Chip 
                                    label={getStatusLabel(item.status)} 
                                    color={getStatusColor(item.status)}
                                    size="small"
                                />
                            </Box>
                        </CardContent>
                        <CardActions>
                            <IconButton
                                size="small"
                                onClick={() => handleEquipmentClick(item)}
                                color="primary"
                            >
                                <VisibilityIcon />
                            </IconButton>
                            <IconButton
                                size="small"
                                color="secondary"
                            >
                                <SettingsIcon />
                            </IconButton>
                        </CardActions>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Карта предприятия
                </Typography>
                <Box>
                    <FormControl size="small" sx={{ mr: 2, minWidth: 150 }}>
                        <InputLabel>Статус</InputLabel>
                        <Select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <MenuItem value="all">Все</MenuItem>
                            <MenuItem value="active">Активные</MenuItem>
                            <MenuItem value="maintenance">Обслуживание</MenuItem>
                            <MenuItem value="error">Ошибки</MenuItem>
                            <MenuItem value="inactive">Неактивные</MenuItem>
                        </Select>
                    </FormControl>
                    
                    <Button
                        variant={viewMode === 'map' ? 'contained' : 'outlined'}
                        onClick={() => setViewMode('map')}
                        sx={{ mr: 1 }}
                    >
                        Карта
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'contained' : 'outlined'}
                        onClick={() => setViewMode('list')}
                    >
                        Список
                    </Button>
                </Box>
            </Box>

            {viewMode === 'map' ? <MapView /> : <ListView />}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedEquipment?.name}
                </DialogTitle>
                <DialogContent>
                    {selectedEquipment && (
                        <Box sx={{ pt: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="body2">
                                        <strong>Тип:</strong> {getEquipmentTypeLabel(selectedEquipment.type)}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Статус:</strong> {getStatusLabel(selectedEquipment.status)}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Расположение:</strong> {selectedEquipment.location.zone}, этаж {selectedEquipment.location.floor}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Координаты:</strong> X: {selectedEquipment.coordinates.x}, Y: {selectedEquipment.coordinates.y}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="body2">
                                        <strong>Отдел:</strong> {selectedEquipment.department}
                                    </Typography>
                                    {selectedEquipment.operator && (
                                        <Typography variant="body2">
                                            <strong>Оператор:</strong> {selectedEquipment.operator}
                                        </Typography>
                                    )}
                                    <Typography variant="body2">
                                        <strong>Последняя активность:</strong> {selectedEquipment.lastActivity}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Закрыть</Button>
                    <Button variant="contained" startIcon={<SettingsIcon />}>
                        Настройки
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default EnterpriseMapPage;
