import React, { useState } from 'react';
import { Button, Table, Space, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import OrganizationModal from '../components/OrganizationModal';

interface Organization {
  id: string;
  name: string;
  fullName: string;
  businessArea: string;
  email: string;
  website: string;
  phones: string[];
  address: string;
  director: string;
  inn: string;
  ogrn: string;
}

const Organizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);

  const columns = [
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Organization) => (
        <Space>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Изменить
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setEditingOrganization(null);
    setIsModalVisible(true);
  };

  const handleEdit = (organization: Organization) => {
    setEditingOrganization(organization);
    setIsModalVisible(true);
  };

  const handleDelete = (organization: Organization) => {
    Modal.confirm({
      title: 'Подтверждение удаления',
      content: `Вы уверены, что хотите удалить организацию "${organization.name}"?`,
      okText: 'Да',
      cancelText: 'Нет',
      onOk: () => {
        setOrganizations(orgs => orgs.filter(org => org.id !== organization.id));
      },
    });
  };

  const handleModalOk = (organization: Organization) => {
    if (editingOrganization) {
      setOrganizations(orgs =>
        orgs.map(org => (org.id === organization.id ? organization : org))
      );
    } else {
      setOrganizations(orgs => [...orgs, { ...organization, id: Date.now().toString() }]);
    }
    setIsModalVisible(false);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Добавить
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={organizations}
        rowKey="id"
      />
      <OrganizationModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleModalOk}
        organization={editingOrganization}
      />
    </div>
  );
};

export default Organizations; 