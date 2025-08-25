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
    CardActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { 
    Add as AddIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon,
    Description as DescriptionIcon,
    Download as DownloadIcon
} from '@mui/icons-material';

const WPSPage = () => {
    const [wpsList, setWpsList] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingWPS, setEditingWPS] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        weldingMethod: '',
        materialType: '',
        thickness: '',
        currentMin: '',
        currentMax: '',
        voltageMin: '',
        voltageMax: '',
        feedRate: '',
        gasConsumption: '',
        gostStandard: '',
        status: 'active'
    });

    useEffect(() => {
        loadWPS();
    }, []);

    const loadWPS = async () => {
        try {
            // TODO: Заменить на реальный API вызов
            const mockData = [
                {
                    id: 1,
                    name: 'WPS-001',
                    description: 'Сварка низкоуглеродистой стали',
                    weldingMethod: 'MIG',
                    materialType: 'Ст3',
                    thickness: '3-8 мм',
                    currentMin: 120,
                    currentMax: 180,
                    voltageMin: 18,
                    voltageMax: 22,
                    feedRate: '4-6 м/мин',
                    gasConsumption: '12-15 л/мин',
                    gostStandard: 'ГОСТ 14771-76',
                    status: 'active',
                    createdAt: '2024-01-10',
                    updatedAt: '2024-01-15'
                },
                {
                    id: 2,
                    name: 'WPS-002',
                    description: 'Сварка нержавеющей стали',
                    weldingMethod: 'TIG',
                    materialType: '12Х18Н10Т',
                    thickness: '1-4 мм',
                    currentMin: 80,
                    currentMax: 140,
                    voltageMin: 12,
                    voltageMax: 16,
                    feedRate: '2-4 м/мин',
                    gasConsumption: '8-12 л/мин',
                    gostStandard: 'ГОСТ 14776-79',
                    status: 'active',
                    createdAt: '2024-01-12',
                    updatedAt: '2024-01-14'
                },
                {
                    id: 3,
                    name: 'WPS-003',
                    description: 'Сварка алюминия',
                    weldingMethod: 'MIG',
                    materialType: 'АМг6',
                    thickness: '2-6 мм',
                    currentMin: 140,
                    currentMax: 200,
                    voltageMin: 20,
                    voltageMax: 24,
                    feedRate: '5-7 м/мин',
                    gasConsumption: '15-18 л/мин',
                    gostStandard: 'ГОСТ 14806-80',
                    status: 'draft',
                    createdAt: '2024-01-13',
                    updatedAt: '2024-01-13'
                }
            ];
            setWpsList(mockData);
        } catch (error) {
            console.error('Ошибка загрузки WPS:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'draft':
                return 'warning';
            case 'archived':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active':
                return 'Активна';
            case 'draft':
                return 'Черновик';
            case 'archived':
                return 'Архив';
            default:
                return 'Неизвестно';
        }
    };

    const handleOpenDialog = (wps = null) => {
        if (wps) {
            setEditingWPS(wps);
            setFormData({
                name: wps.name,
                description: wps.description,
                weldingMethod: wps.weldingMethod,
                materialType: wps.materialType,
                thickness: wps.thickness,
                currentMin: wps.currentMin,
                currentMax: wps.currentMax,
                voltageMin: wps.voltageMin,
                voltageMax: wps.voltageMax,
                feedRate: wps.feedRate,
                gasConsumption: wps.gasConsumption,
                gostStandard: wps.gostStandard,
                status: wps.status
            });
        } else {
            setEditingWPS(null);
            setFormData({
                name: '',
                description: '',
                weldingMethod: '',
                materialType: '',
                thickness: '',
                currentMin: '',
                currentMax: '',
                voltageMin: '',
                voltageMax: '',
                feedRate: '',
                gasConsumption: '',
                gostStandard: '',
                status: 'active'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingWPS(null);
        setFormData({
            name: '',
            description: '',
            weldingMethod: '',
            materialType: '',
            thickness: '',
            currentMin: '',
            currentMax: '',
            voltageMin: '',
            voltageMax: '',
            feedRate: '',
            gasConsumption: '',
            gostStandard: '',
            status: 'active'
        });
    };

    const handleSubmit = async () => {
        try {
            if (editingWPS) {
                // Обновление существующей WPS
                console.log('Обновление WPS:', formData);
            } else {
                // Создание новой WPS
                console.log('Создание WPS:', formData);
            }
            handleCloseDialog();
            loadWPS();
        } catch (error) {
            console.error('Ошибка сохранения WPS:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту технологическую карту?')) {
            try {
                console.log('Удаление WPS:', id);
                loadWPS();
            } catch (error) {
                console.error('Ошибка удаления WPS:', error);
            }
        }
    };

    const handleDownload = (wps) => {
        // TODO: Реализовать скачивание WPS в формате PDF
        console.log('Скачивание WPS:', wps.name);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Технологические карты сварки (WPS)
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Добавить WPS
                </Button>
            </Box>

            <Grid container spacing={3}>
                {wpsList.map((wps) => (
                    <Grid item xs={12} md={6} lg={4} key={wps.id}>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" mb={2}>
                                    <DescriptionIcon />
                                    <Typography variant="h6" ml={1}>
                                        {wps.name}
                                    </Typography>
                                </Box>
                                
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {wps.description}
                                </Typography>
                                
                                <Box mt={2}>
                                    <Typography variant="body2">
                                        <strong>Метод сварки:</strong> {wps.weldingMethod}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Материал:</strong> {wps.materialType}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Толщина:</strong> {wps.thickness}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Ток:</strong> {wps.currentMin}-{wps.currentMax} А
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Напряжение:</strong> {wps.voltageMin}-{wps.voltageMax} В
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Скорость подачи:</strong> {wps.feedRate}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Расход газа:</strong> {wps.gasConsumption}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>ГОСТ:</strong> {wps.gostStandard}
                                    </Typography>
                                </Box>
                                
                                <Box mt={2} display="flex" gap={1}>
                                    <Chip 
                                        label={getStatusLabel(wps.status)} 
                                        color={getStatusColor(wps.status)}
                                        size="small"
                                    />
                                </Box>
                            </CardContent>
                            <CardActions>
                                <IconButton
                                    size="small"
                                    onClick={() => handleOpenDialog(wps)}
                                    color="primary"
                                >
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleDownload(wps)}
                                    color="secondary"
                                >
                                    <DownloadIcon />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => handleDelete(wps.id)}
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
                    {editingWPS ? 'Редактировать WPS' : 'Добавить WPS'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Название WPS"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth margin="normal" required>
                                    <InputLabel>Метод сварки</InputLabel>
                                    <Select
                                        value={formData.weldingMethod}
                                        onChange={(e) => setFormData({ ...formData, weldingMethod: e.target.value })}
                                    >
                                        <MenuItem value="MIG">MIG</MenuItem>
                                        <MenuItem value="TIG">TIG</MenuItem>
                                        <MenuItem value="MMA">MMA</MenuItem>
                                        <MenuItem value="SAW">SAW</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Описание"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    margin="normal"
                                    multiline
                                    rows={3}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Тип материала"
                                    value={formData.materialType}
                                    onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Толщина"
                                    value={formData.thickness}
                                    onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Минимальный ток (А)"
                                    type="number"
                                    value={formData.currentMin}
                                    onChange={(e) => setFormData({ ...formData, currentMin: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Максимальный ток (А)"
                                    type="number"
                                    value={formData.currentMax}
                                    onChange={(e) => setFormData({ ...formData, currentMax: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Минимальное напряжение (В)"
                                    type="number"
                                    value={formData.voltageMin}
                                    onChange={(e) => setFormData({ ...formData, voltageMin: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Максимальное напряжение (В)"
                                    type="number"
                                    value={formData.voltageMax}
                                    onChange={(e) => setFormData({ ...formData, voltageMax: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Скорость подачи"
                                    value={formData.feedRate}
                                    onChange={(e) => setFormData({ ...formData, feedRate: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Расход газа"
                                    value={formData.gasConsumption}
                                    onChange={(e) => setFormData({ ...formData, gasConsumption: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="ГОСТ"
                                    value={formData.gostStandard}
                                    onChange={(e) => setFormData({ ...formData, gostStandard: e.target.value })}
                                    margin="normal"
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth margin="normal">
                                    <InputLabel>Статус</InputLabel>
                                    <Select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <MenuItem value="active">Активна</MenuItem>
                                        <MenuItem value="draft">Черновик</MenuItem>
                                        <MenuItem value="archived">Архив</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Отмена</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingWPS ? 'Сохранить' : 'Добавить'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default WPSPage;
