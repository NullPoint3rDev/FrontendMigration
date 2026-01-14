import React from 'react';
import '../styles/plugPage.css';
import AboutPlug from '../images/AboutPlug.jpg';

const AboutPage = () => {
    return (
        <div className="plug-page">
            <div className="plug-image-container">
                <img src={AboutPlug} alt="О программе" className="plug-image" />
            </div>
            <div className="plug-text">Пока не доварили</div>
        </div>
    );
};

export default AboutPage;
