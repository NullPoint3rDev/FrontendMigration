import React from 'react';
import '../styles/plugPage.css';
import WPSPlug from '../images/WPSPlug.jpg';

const WPSPage = () => {
    return (
        <div className="plug-page">
            <div className="plug-image-container">
                <img src={WPSPlug} alt="Технологические карты сварки (WPS)" className="plug-image" />
            </div>
            <div className="plug-text">Пока не доварили</div>
        </div>
    );
};

export default WPSPage;
