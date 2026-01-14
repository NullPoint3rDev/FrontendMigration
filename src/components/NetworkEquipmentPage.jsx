import React from 'react';
import '../styles/plugPage.css';
import NetworkEquipmentPlug from '../images/NetworkEquipmentPlug.jpg';

const NetworkEquipmentPage = () => {
    return (
        <div className="plug-page">
            <div className="plug-image-container">
                <img src={NetworkEquipmentPlug} alt="Сетевое оборудование" className="plug-image" />
            </div>
            <div className="plug-text">Пока не доварили</div>
        </div>
    );
};

export default NetworkEquipmentPage;
