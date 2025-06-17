import React, { useState } from 'react';
import Navbar from './Navbar';
import OrganizationModal from './OrganizationModal';
import '../styles/organizations.css';

const initialData = [
    {
        id: '1',
        name: 'ООО "СварТех"',
        fullName: 'Общество с ограниченной ответственностью "СварТех"',
        businessArea: 'Производство сварочного оборудования',
        email: 'info@svartech.ru',
        website: 'https://svartech.ru',
        phones: ['+7 (495) 123-45-67', '+7 (495) 765-43-21'],
        address: 'г. Москва, ул. Сварочная, д. 1',
        director: 'Иванов Иван Иванович',
        inn: '7700123456',
        ogrn: '1027700123456'
    },
    // ...more
];

export default function OrganizationsPage() {
    const [organizations, setOrganizations] = useState(initialData);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null);

    const openAddModal = () => { setEditingOrg(null); setModalOpen(true); };
    const openEditModal = (org) => { setEditingOrg(org); setModalOpen(true); };
    const closeModal = () => setModalOpen(false);

    const handleSave = (org) => {
        if (editingOrg) {
            setOrganizations(orgs => orgs.map(o => o.id === org.id ? org : o));
        } else {
            setOrganizations(orgs => [...orgs, { ...org, id: Date.now().toString() }]);
        }
        closeModal();
    };

    const handleDelete = (id) => {
        setOrganizations(orgs => orgs.filter(o => o.id !== id));
        closeModal();
    };

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="header">
                    <h1>Организации</h1>
                    <button className="add-btn" onClick={openAddModal}>Добавить</button>
                </div>
                <table className="organizations-table">
                    <thead>
                    <tr>
                        <th>Наименование</th>
                        <th>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {organizations.map(org => (
                        <tr key={org.id}>
                            <td>{org.name}</td>
                            <td>
                                <button className="action-btn edit" onClick={() => openEditModal(org)}>
                                    Изменить
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                <OrganizationModal
                    visible={modalOpen}
                    onClose={closeModal}
                    organization={editingOrg}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            </div>
        </>
    );
}