import React from 'react';
import '../styles/plugPage.css';
import MaterialsPlug from '../images/MaterialsPlug.jpeg';

const MaterialsPage = () => {
    return (
        <div className="plug-page">
            <div className="plug-image-container">
                <img src={MaterialsPlug} alt="Сварочные материалы" className="plug-image" />
            </div>
            <div className="plug-text">Пока не доварили</div>
        </div>
    );
};

export default MaterialsPage;

