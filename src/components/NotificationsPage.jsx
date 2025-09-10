import React, { useState, useEffect } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Typography,
    Paper,
    Container,
    Alert,
    CircularProgress
} from '@mui/material';
import { 
    Notifications as NotificationsIcon,
    Schedule as ScheduleIcon,
    Settings as SettingsIcon
} from '@mui/icons-material';
import NotificationsSection from './NotificationsSection';
import AutomatedReportsSection from './AutomatedReportsSection';
import './styles/notificationsPage.css';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`notifications-tabpanel-${index}`}
            aria-labelledby={`notifications-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index) {
    return {
        id: `notifications-tab-${index}`,
        'aria-controls': `notifications-tabpanel-${index}`,
    };
}

const NotificationsPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const tabs = [
        {
            label: 'Уведомления',
            icon: <NotificationsIcon />,
            component: <NotificationsSection />
        },
        {
            label: 'Автоматизированные отчеты',
            icon: <ScheduleIcon />,
            component: <AutomatedReportsSection />
        }
    ];

    return (
        <Container maxWidth="xl" className="notifications-page">
            <Box sx={{ width: '100%' }}>
                <Paper elevation={2} sx={{ mb: 3 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            aria-label="notifications tabs"
                            variant="fullWidth"
                        >
                            {tabs.map((tab, index) => (
                                <Tab
                                    key={index}
                                    icon={tab.icon}
                                    label={tab.label}
                                    iconPosition="start"
                                    {...a11yProps(index)}
                                />
                            ))}
                        </Tabs>
                    </Box>
                </Paper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {loading && (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                )}

                {tabs.map((tab, index) => (
                    <TabPanel key={index} value={activeTab} index={index}>
                        {tab.component}
                    </TabPanel>
                ))}
            </Box>
        </Container>
    );
};

export default NotificationsPage;
