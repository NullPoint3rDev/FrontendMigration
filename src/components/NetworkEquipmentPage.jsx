import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Box,
    Chip,
    Grid,
    Card,
    CardContent,
    CardActions
} from '@mui/material';
import { 
    Add as AddIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon,
    Settings as SettingsIcon,
    Wifi as WifiIcon,
    Router as RouterIcon,
    Hub as HubIcon
} from '@mui/icons-material';

const NetworkEquipmentPage = () => {
    const [equipment, setEquipment] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        ipAddress: '',
        macAddress: '',
        location: '',
        description: '',
        status: 'active'
    });

    useEffect(() => {
        loadEquipment();
    }, []);

    const loadEquipment = async () => {
        try {
            // TODO: Заменить на реальный API вызов
            const mockData = [
                {
                    id: 1,
                    name: 'Мониторинг-блок МС-1001',
                    type: 'monitoring_block',
                    ipAddress: '192.168.1.100',
                    macAddress: '00:1B:44:11:3A:B7',
                    location: 'Цех №1, участок А',
                    description: 'Блок мониторинга сварочного оборудования',
                    status: 'active',
                    lastSeen: '2024-01-15 14:30:00'
                },
                {
                    id: 2,
                    name: 'Сетевой концентратор HUB-01',
                    type: 'hub',
                    ipAddress: '192.168.1.101',
                    macAddress: '00:1B:44:11:3A:B8',
                    location: 'Серверная',
                    description: 'Центральный концентратор сети мониторинга',
                    status: 'active',
                    lastSeen: '2024-01-15 14:25:00'
                },
                {
                    id: 3,
                    name: 'WiFi роутер WR-01',
                    type: 'router',
                    ipAddress: '192.168.1.1',
                    macAddress: '00:1B:44:11:3A:B9',
                    location: 'Офис',
                    description: 'Беспроводной роутер для подключения мобильных устройств',
                    status: 'active',
                    lastSeen: '2024-01-15 14:20:00'
                }
            ];
            setEquipment(mockData);
        } catch (error) {
            console.error('Ошибка загрузки оборудования:', error);
        }
    };

    const getEquipmentIcon = (type) => {
        switch (type) {
            case 'monitoring_block':
                return <SettingsIcon />;
            case 'hub':
                return <HubIcon />;
            case 'router':
                return <RouterIcon />;
            default:
                return <WifiIcon />;
        }
    };

    const getEquipmentTypeLabel = (type) => {
        switch (type) {
            case 'monitoring_block':
                return 'Блок мониторинга';
            case 'hub':
                return 'Концентратор';
            case 'router':
                return 'Роутер';
            default:
                return 'Неизвестно';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'error';
            case 'maintenance':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return 'Активен';
            case 'inactive':
                return 'Неактивен';
            case 'maintenance':
                return 'Обслуживание';
            default:
                return 'Неизвестно';
        }
    };

    const handleOpenDialog = (equipmentItem = null) => {
        if (equipmentItem) {
            setEditingEquipment(equipmentItem);
            setFormData({
                name: equipmentItem.name,
                type: equipmentItem.type,
                ipAddress: equipmentItem.ipAddress,
                macAddress: equipmentItem.macAddress,
                location: equipmentItem.location,
                description: equipmentItem.description,
                status: equipmentItem.status
            });
        } else {
            setEditingEquipment(null);
            setFormData({
                name: '',
                type: '',
                ipAddress: '',
                macAddress: '',
                location: '',
                description: '',
                status: 'active'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingEquipment(null);
        setFormData({
            name: '',
            type: '',
            ipAddress: '',
            macAddress: '',
            location: '',
            description: '',
            status: 'active'
        });
    };

    const handleSubmit = async () => {
        try {
            if (editingEquipment) {
                // Обновление существующего оборудования
                console.log('Обновление оборудования:', formData);
            } else {
                // Создание нового оборудования
                console.log('Создание оборудования:', formData);
            }
            handleCloseDialog();
            loadEquipment();
        } catch (error) {
            console.error('Ошибка сохранения оборудования:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это оборудование?')) {
            try {
                console.log('Удаление оборудования:', id);
                loadEquipment();
            } catch (error) {
                console.error('Ошибка удаления оборудования:', error);
            }
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Сетевое оборудование системы мониторинга
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Добавить оборудование
                </Button>
            </Box>

            <Grid container spacing={3}>
                {equipment.map((item) => (
                    <Grid item xs={12} md={6} lg={4} key={item.id}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" mb={2}>
                                    {getEquipmentIcon(item.type)}
                                    <Typography variant="h6" ml={1}>
                                        {item.name}
                                    </Typography>
                                </Box>
                                
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {item.description}
                                </Typography>
                                
                                <Box mt={2}>
                                    <Typography variant="body2">
                                        <strong>Тип:</strong> {getEquipmentTypeLabel(item.type)}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>IP:</strong> {item.ipAddress}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>MAC:</strong> {item.macAddress}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Расположение:</strong> {item.location}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Последняя активность:</strong> {item.lastSeen}
                                    </Typography>
                                </Box>
                                
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
                                    onClick={() => handleOpenDialog(item)}
                                    color="primary"
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleDelete(item.id)}
                                    color="error"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingEquipment ? 'Редактировать оборудование' : 'Добавить оборудование'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Название оборудования"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Тип оборудования"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            margin="normal"
                            select
                            SelectProps={{ native: true }}
                            required
                        >
                            <option value="">Выберите тип</option>
                            <option value="monitoring_block">Блок мониторинга</option>
                            <option value="hub">Концентратор</option>
                            <option value="router">Роутер</option>
                        </TextField>
                        <TextField
                            fullWidth
                            label="IP адрес"
                            value={formData.ipAddress}
                            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="MAC адрес"
                            value={formData.macAddress}
                            onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Расположение"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Описание"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            margin="normal"
                            multiline
                            rows={3}
                        />
                        <TextField
                            fullWidth
                            label="Статус"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            margin="normal"
                            select
                            SelectProps={{ native: true }}
                        >
                            <option value="active">Активен</option>
                            <option value="inactive">Неактивен</option>
                            <option value="maintenance">Обслуживание</option>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Отмена</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingEquipment ? 'Сохранить' : 'Добавить'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default NetworkEquipmentPage;
