import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import UserProfile from '../components/UserProfile';
import { createWelder } from '../api/welderApi';
import { getAllOrganizationUnits } from '../api/organizationUnitApi';
import '../styles/addWelderPage.css';

function AddWelderPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        lastName: '',
        firstName: '',
        middleName: '',
        employeeId: '',
        birthDate: '',
        phone: '',
        hireDate: '',
        position: '',
        organizationUnitId: ''
    });
    const [organizationUnits, setOrganizationUnits] = useState([]);
    const [errors, setErrors] = useState({});
    const [profileImage, setProfileImage] = useState(null);
    const [rfidPasses, setRfidPasses] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [relatedMachines, setRelatedMachines] = useState([]);

    useEffect(() => {
        loadOrganizationUnits();
    }, []);

    const loadOrganizationUnits = async () => {
        try {
            const units = await getAllOrganizationUnits();
            setOrganizationUnits(units);
        } catch (error) {
            console.error('Ошибка загрузки подразделений:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Очищаем ошибку для этого поля
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddRfidPass = () => {
        const newPass = {
            id: Date.now(),
            code: `OB EA${Math.random().toString(16).substr(2, 8).toUpperCase()}F`
        };
        setRfidPasses([...rfidPasses, newPass]);
    };

    const handleDeleteRfidPass = (id) => {
        setRfidPasses(rfidPasses.filter(pass => pass.id !== id));
    };

    const handleAddCertification = () => {
        // Логика добавления аттестации
        console.log('Добавить аттестацию');
    };

    const handleAddMachine = () => {
        // Логика добавления аппарата
        console.log('Добавить аппарат');
    };

    const handleDeleteMachine = () => {
        // Логика удаления аппаратов
        console.log('Удалить аппараты');
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Фамилия обязательна';
        }
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Имя обязательно';
        }
        if (!formData.position) {
            newErrors.position = 'Должность обязательна';
        }
        if (!formData.organizationUnitId) {
            newErrors.organizationUnitId = 'Подразделение обязательно';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            const welderData = {
                name: `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim(),
                fullName: `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim(),
                employeeId: formData.employeeId,
                tabNumber: formData.employeeId,
                position: formData.position,
                organizationUnitId: formData.organizationUnitId,
                birthDate: formData.birthDate,
                phone: formData.phone,
                hireDate: formData.hireDate,
                status: 'offline'
            };

            await createWelder(welderData);
            alert('Сварщик успешно создан');
            navigate('/welders');
        } catch (error) {
            console.error('Ошибка создания сварщика:', error);
            alert('Ошибка при создании сварщика');
        }
    };

    const positions = [
        'Электросварщик',
        'Главный сварщик',
        'Сварщик',
        'Монтажник'
    ];

    return (
        <div className="add-welder-page">
            {/* Header */}
            <div className="add-welder-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/welders')}>
                        ←
                    </button>
                    <h1 className="page-title">Сварщик</h1>
                </div>
                <div className="header-right">
                    <button
                        className="control-btn notifications-btn"
                        onClick={() => navigate('/notifications')}
                    >
                        <FaBell className="notifications-icon" />
                        <span className="notifications-badge"></span>
                    </button>
                    <UserProfile />
                </div>
            </div>

            {/* Main Content */}
            <div className="add-welder-content">
                {/* Profile and RFID Section - Same Row */}
                <div className="profile-rfid-row">
                    {/* Profile Section */}
                    <div className="profile-section">
                        <div className="profile-image-container">
                            <div className="profile-image">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" />
                                ) : (
                                    <div className="profile-placeholder">
                                        <span>Фото</span>
                                    </div>
                                )}
                            </div>
                            <label className="change-photo-btn">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />
                                Сменить фото
                            </label>
                        </div>

                        <div className="profile-form-columns">
                            {/* First Column */}
                            <div className="form-column">
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        placeholder="Фамилия*"
                                        className={errors.lastName ? 'error' : ''}
                                    />
                                    {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        placeholder="Имя*"
                                        className={errors.firstName ? 'error' : ''}
                                    />
                                    {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="middleName"
                                        value={formData.middleName}
                                        onChange={handleInputChange}
                                        placeholder="Отчество"
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleInputChange}
                                        placeholder="Год рождения:"
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="date"
                                        name="hireDate"
                                        value={formData.hireDate}
                                        onChange={handleInputChange}
                                        placeholder="Дата приёма:"
                                    />
                                </div>
                            </div>

                            {/* Second Column */}
                            <div className="form-column">
                                <div className="form-group">
                                    <select
                                        name="position"
                                        value={formData.position}
                                        onChange={handleInputChange}
                                        className={`select-with-label ${errors.position ? 'error' : ''}`}
                                        data-label="Должность*"
                                    >
                                        <option value="" disabled>Должность*</option>
                                        {positions.map(pos => (
                                            <option key={pos} value={pos}>{pos}</option>
                                        ))}
                                    </select>
                                    {errors.position && <span className="error-text">{errors.position}</span>}
                                </div>
                                <div className="form-group">
                                    <select
                                        name="organizationUnitId"
                                        value={formData.organizationUnitId}
                                        onChange={handleInputChange}
                                        className={`select-with-label ${errors.organizationUnitId ? 'error' : ''}`}
                                        data-label="Подразделение*"
                                    >
                                        <option value="" disabled>Подразделение*</option>
                                        {organizationUnits.map(unit => (
                                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                                        ))}
                                    </select>
                                    {errors.organizationUnitId && <span className="error-text">{errors.organizationUnitId}</span>}
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="employeeId"
                                        value={formData.employeeId}
                                        onChange={handleInputChange}
                                        placeholder="Табельный номер"
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Номер телефона"
                                    />
                                </div>
                                <div className="form-group">
                                    <button type="button" className="save-btn" onClick={handleSave}>
                                        Сохранить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RFID Passes Section */}
                    <div className="rfid-section">
                        <div className="rfid-header">
                            <h2>Пропуска RFID</h2>
                            <button className="add-btn" onClick={handleAddRfidPass}>
                                + Добавить пропуск
                            </button>
                        </div>
                        <div className="rfid-list scrollable-section">
                            {rfidPasses.map(pass => (
                                <div key={pass.id} className="rfid-item">
                                    <input type="checkbox" />
                                    <span className="rfid-icon">📱</span>
                                    <span className="rfid-code">{pass.code}</span>
                                    <button
                                        className="delete-btn-small"
                                        onClick={() => handleDeleteRfidPass(pass.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                            {rfidPasses.length === 0 && (
                                <div className="empty-state">Нет пропусков</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Certifications Section */}
                <div className="section certifications-section">
                    <div className="section-actions-only">
                        <button className="add-btn" onClick={handleAddCertification}>
                            + Добавить аттестацию
                        </button>
                        <button className="naks-btn" onClick={() => {}}>
                            Открыть реестр НАКС
                        </button>
                    </div>
                    <div className="certifications-table scrollable-section">
                        <table>
                            <thead>
                            <tr>
                                <th>Способ свар.</th>
                                <th>Гр. тех. устройств</th>
                                <th>Вид деталей</th>
                                <th>Типы швов</th>
                                <th>Свар. мат.</th>
                                <th>Свар. соединение</th>
                                <th>Свар. полож.</th>
                                <th>Толщ. дет.</th>
                                <th>Нар. дмиам.</th>
                                <th>Действ. до</th>
                                <th>Статус</th>
                            </tr>
                            </thead>
                            <tbody>
                            {certifications.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="empty-state">Нет аттестаций</td>
                                </tr>
                            ) : (
                                certifications.map(cert => (
                                    <tr key={cert.id}>
                                        <td>{cert.method}</td>
                                        <td>{cert.group}</td>
                                        <td>{cert.parts}</td>
                                        <td>{cert.seams}</td>
                                        <td>{cert.material}</td>
                                        <td>{cert.connection}</td>
                                        <td>{cert.position}</td>
                                        <td>{cert.thickness}</td>
                                        <td>{cert.diameter}</td>
                                        <td>{cert.validUntil}</td>
                                        <td>{cert.status}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Related Machines Section */}
                <div className="section machines-section">
                    <div className="section-actions-only">
                        <button className="add-btn" onClick={handleAddMachine}>
                            + Добавить аппарат
                        </button>
                        <button className="delete-btn" onClick={handleDeleteMachine}>
                            Удалить
                        </button>
                    </div>
                    <div className="machines-table scrollable-section">
                        <table>
                            <thead>
                            <tr>
                                <th></th>
                                <th>Модель</th>
                                <th>Название</th>
                                <th>Подразделение</th>
                                <th>Инвентарный номер</th>
                                <th>Сварщик</th>
                                <th>Последнее включение</th>
                                <th>Статус</th>
                            </tr>
                            </thead>
                            <tbody>
                            {relatedMachines.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="empty-state">Нет связанных аппаратов</td>
                                </tr>
                            ) : (
                                relatedMachines.map(machine => (
                                    <tr key={machine.id}>
                                        <td><input type="checkbox" /></td>
                                        <td>{machine.model}</td>
                                        <td>{machine.name}</td>
                                        <td>{machine.department}</td>
                                        <td>{machine.inventoryNumber}</td>
                                        <td>{machine.welder}</td>
                                        <td>{machine.lastTurnOn}</td>
                                        <td>{machine.status}</td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddWelderPage;

