import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import '../styles/control.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const devicesConfig = {
  Pulse: {
    image: 'pulseFront.png',
    parameters: [
      { label: 'Состояние', value: 'Выключен', id: 'status' },
      { label: 'MAC Адрес', value: '001A2B3C4D5E', id: 'mac' },
      { label: 'Модель аппарата', value: '0', id: 'model' },
      { label: 'Версия прошивки', value: '0', id: 'version' },
      { label: 'Материал сварочной проволоки', value: 'Алюминий', id: 'material' },
      { label: 'Тип сварки', value: 'Pulse', id: 'weldingType' },
      { label: 'Режим работы горелки', value: '2T', id: 'burnerMode' },
      { label: 'Диаметр сварочной проволоки', value: '1.2', id: 'weldingFeed' },
      { label: 'Номер программы', value: '0', id: 'programNumber' },
      { label: 'Ток MIGMAG', value: '0 A', id: 'currentMIG' },
      { label: 'Напряжение MIGMAG', value: '0 В', id: 'voltageMIG' },
      { label: 'Индуктивность MIG', value: '0', id: 'inductionMIG' },
      { label: 'Размер Катета сварного шва', value: '0 mm', id: 'alloyDimension' },
      { label: 'Скорость подачи сварочной проволоки', value: '0 м/мин', id: 'wireFeedSpeed' },
      { label: 'Толщина металла', value: '0 mm', id: 'metalThickness' },
      { label: 'Скорость движения горелки во время сварки', value: '0 мм/сек', id: 'burnerSpeed' },
      { label: 'Степень эластичности дуги', value: '0', id: 'elastic' },
      { label: 'Индуктивность P-MIG', value: '0', id: 'inductionPMIG' },
      { label: 'Ток', value: '0 A', id: 'current' },
      { label: 'Напряжение', value: '0 В', id: 'voltage' },
      { label: 'Форсаж дуги', value: '0', id: 'arcBoost' },
    ],
    controls: [
      {
        type: 'select',
        label: 'Режим управления',
        id: 'controlMode',
        options: [
          { value: 'unlimited', text: 'Без ограничений' },
          { value: 'current', text: 'Блокировка' },
          { value: 'passive', text: 'Пассивный' },
        ],
      },
      {
        type: 'slider',
        label: 'Ток MIGMAG',
        id: 'currentMIG',
        min: 8,
        max: 500,
        unit: ' А',
      },
      {
        type: 'slider',
        label: 'Напряжение',
        id: 'voltage',
        min: 8,
        max: 50,
        unit: 'В',
      },
    ],
  },
  T2: {
    image: 'T2Front.png',
    parameters: [
      { label: 'Состояние', value: 'Выключен', id: 'status' },
      { label: 'Частота АС', value: '0 Hz', id: 'acFreq' },
    ],
    controls: [
      {
        type: 'select',
        label: 'Режим сварки',
        id: 'weldMode',
        options: [
          { value: 'tig', text: 'TIG' },
          { value: 'ac', text: 'AC' },
        ],
      },
      {
        type: 'slider',
        label: 'Частота АС (30-300 Hz)',
        id: 'acFreq',
        min: 30,
        max: 300,
        unit: ' Hz',
      },
    ],
  },
};

function getDeviceIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('machine') || 'Pulse';
}

const initialChartData = (initValue) => Array(50).fill(initValue);

const chartOptions = (color) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { display: false },
    y: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: '#fff' },
    },
  },
  animation: { duration: 0 },
});

const WeldingMachineControlPage = () => {
  const deviceId = getDeviceIdFromQuery();
  const device = devicesConfig[deviceId] || devicesConfig.Pulse;

  // Parameters state
  const [parameters, setParameters] = useState(device.parameters.map(p => ({ ...p })));
  // Controls state
  const [controls, setControls] = useState(
      device.controls.map(c =>
          c.type === 'slider' ? { ...c, value: c.min } : { ...c, value: c.options[0].value }
      )
  );
  // Chart state
  const [currentData, setCurrentData] = useState(initialChartData(200));
  const [voltageData, setVoltageData] = useState(initialChartData(24));

  // Chart update interval
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentData((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(150, Math.min(250, last + (Math.random() - 0.5) * 10));
        return [...prev.slice(1), next];
      });
      setVoltageData((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(20, Math.min(28, last + (Math.random() - 0.5) * 2));
        return [...prev.slice(1), next];
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Control handlers
  const handleControlChange = (id, value) => {
    setControls((prev) =>
        prev.map((c) => (c.id === id ? { ...c, value } : c))
    );
  };

  // Save settings
  const handleSave = () => {
    const settings = {};
    controls.forEach((c) => {
      settings[c.id] = c.value;
    });
    localStorage.setItem(`welderSettings_${deviceId}`, JSON.stringify(settings));
    alert('Настройки успешно сохранены!');
  };

  // Load settings on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(`welderSettings_${deviceId}`));
    if (saved) {
      setControls((prev) =>
          prev.map((c) => ({ ...c, value: saved[c.id] !== undefined ? saved[c.id] : c.value }))
      );
    }
  }, [deviceId]);

  // Render
  return (
      <div>
        <div className="nav-container">
          <nav className="nav-menu">
            <button className="back-btn" onClick={() => window.history.back()}>
              ← Назад к оборудованию
            </button>
          </nav>
        </div>
        <div className="container">
          {/* Status Panel */}
          <div className="status-panel">
            <div className="device-display">
              <img
                  src={process.env.PUBLIC_URL + '/images/' + device.image}
                  alt="Дисплей аппарата"
                  style={{ maxHeight: 400 }}
              />
            </div>
            <div className="parameters">
              {parameters.map((param) => (
                  <div className="parameter-row" key={param.id}>
                    <span>{param.label}:</span>
                    <span>{param.value}</span>
                  </div>
              ))}
            </div>
          </div>
          {/* Charts */}
          <div className="charts">
            <div className="chart-container">
              <div className="chart-title">График тока</div>
              <Line
                  data={{
                    labels: Array(currentData.length).fill(''),
                    datasets: [
                      {
                        label: 'Ток (А)',
                        borderColor: '#6C63FF',
                        backgroundColor: 'rgba(108, 99, 255, 0.1)',
                        fill: true,
                        data: currentData,
                        borderWidth: 2,
                        pointRadius: 0,
                      },
                    ],
                  }}
                  options={chartOptions('#6C63FF')}
                  height={350}
              />
            </div>
            <div className="chart-container">
              <div className="chart-title">График напряжения</div>
              <Line
                  data={{
                    labels: Array(voltageData.length).fill(''),
                    datasets: [
                      {
                        label: 'Напряжение (В)',
                        borderColor: '#FF6584',
                        backgroundColor: 'rgba(255, 101, 132, 0.1)',
                        fill: true,
                        data: voltageData,
                        borderWidth: 2,
                        pointRadius: 0,
                      },
                    ],
                  }}
                  options={chartOptions('#FF6584')}
                  height={350}
              />
            </div>
          </div>
          {/* Controls */}
          <div className="controls">
            {controls.map((control) => (
                <div className="control-group" key={control.id}>
                  <label>{control.label}</label>
                  {control.type === 'select' ? (
                      <select
                          value={control.value}
                          onChange={(e) => handleControlChange(control.id, e.target.value)}
                      >
                        {control.options.map((opt) => (
                            <option value={opt.value} key={opt.value}>
                              {opt.text}
                            </option>
                        ))}
                      </select>
                  ) : (
                      <div className="slider-container">
                        <input
                            type="range"
                            min={control.min}
                            max={control.max}
                            value={control.value}
                            className="slider"
                            onChange={(e) => handleControlChange(control.id, e.target.value)}
                        />
                        <span className="value-display">
                    {control.value}
                          {control.unit}
                  </span>
                      </div>
                  )}
                </div>
            ))}
          </div>
          <button className="save-btn" onClick={handleSave}>
            Сохранить настройки
          </button>
        </div>
      </div>
  );
};

export default WeldingMachineControlPage; 