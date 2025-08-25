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
    Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentDepartment: '',
        level: 1
    });

    useEffect(() => {
        // Здесь будет загрузка данных с сервера
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            // TODO: Заменить на реальный API вызов
            const mockData = [
                {
                    id: 1,
                    name: 'Производственный цех №1',
                    description: 'Основной производственный цех',
                    parentDepartment: null,
                    level: 1,
                    employeeCount: 25
                },
                {
                    id: 2,
                    name: 'Сварочный участок',
                    description: 'Участок сварочных работ',
                    parentDepartment: 'Производственный цех №1',
                    level: 2,
                    employeeCount: 12
                },
                {
                    id: 3,
                    name: 'Отдел качества',
                    description: 'Контроль качества продукции',
                    parentDepartment: null,
                    level: 1,
                    employeeCount: 8
                }
            ];
            setDepartments(mockData);
        } catch (error) {
            console.error('Ошибка загрузки подразделений:', error);
        }
    };

    const handleOpenDialog = (department = null) => {
        if (department) {
            setEditingDepartment(department);
            setFormData({
                name: department.name,
                description: department.description,
                parentDepartment: department.parentDepartment || '',
                level: department.level
            });
        } else {
            setEditingDepartment(null);
            setFormData({
                name: '',
                description: '',
                parentDepartment: '',
                level: 1
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingDepartment(null);
        setFormData({
            name: '',
            description: '',
            parentDepartment: '',
            level: 1
        });
    };

    const handleSubmit = async () => {
        try {
            if (editingDepartment) {
                // Обновление существующего подразделения
                // TODO: API вызов для обновления
                console.log('Обновление подразделения:', formData);
            } else {
                // Создание нового подразделения
                // TODO: API вызов для создания
                console.log('Создание подразделения:', formData);
            }
            handleCloseDialog();
            loadDepartments();
        } catch (error) {
            console.error('Ошибка сохранения подразделения:', error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить это подразделение?')) {
            try {
                // TODO: API вызов для удаления
                console.log('Удаление подразделения:', id);
                loadDepartments();
            } catch (error) {
                console.error('Ошибка удаления подразделения:', error);
            }
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Подразделения
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Добавить подразделение
                </Button>
            </Box>

            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Название</TableCell>
                                <TableCell>Описание</TableCell>
                                <TableCell>Родительское подразделение</TableCell>
                                <TableCell>Уровень</TableCell>
                                <TableCell>Количество сотрудников</TableCell>
                                <TableCell>Действия</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {departments.map((department) => (
                                <TableRow key={department.id}>
                                    <TableCell>
                                        <Typography variant="body1" fontWeight="medium">
                                            {department.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{department.description}</TableCell>
                                    <TableCell>
                                        {department.parentDepartment ? (
                                            <Chip label={department.parentDepartment} size="small" />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                -
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={`Уровень ${department.level}`} 
                                            size="small" 
                                            color="primary" 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {department.employeeCount} чел.
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenDialog(department)}
                                            color="primary"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDelete(department.id)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingDepartment ? 'Редактировать подразделение' : 'Добавить подразделение'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Название подразделения"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                            label="Родительское подразделение"
                            value={formData.parentDepartment}
                            onChange={(e) => setFormData({ ...formData, parentDepartment: e.target.value })}
                            margin="normal"
                            select
                            SelectProps={{ native: true }}
                        >
                            <option value="">Нет родительского подразделения</option>
                            {departments
                                .filter(dept => dept.level < 3)
                                .map((dept) => (
                                    <option key={dept.id} value={dept.name}>
                                        {dept.name}
                                    </option>
                                ))}
                        </TextField>
                        <TextField
                            fullWidth
                            label="Уровень"
                            type="number"
                            value={formData.level}
                            onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                            margin="normal"
                            inputProps={{ min: 1, max: 5 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Отмена</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingDepartment ? 'Сохранить' : 'Добавить'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default DepartmentsPage;
