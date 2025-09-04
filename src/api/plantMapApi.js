// API сервис для работы с картой предприятия
import { api } from '../services/api';

export const plantMapApi = {
  // Получить карту предприятия по ID
  async getPlantMap(plantMapId) {
    try {
      return await api.get(`/plant-map/${plantMapId}`);
    } catch (error) {
      console.error('Ошибка получения карты предприятия:', error);
      throw error;
    }
  },

  // Получить карту предприятия по умолчанию для организации
  async getDefaultPlantMap(organizationId) {
    try {
      return await api.get(`/plant-map/default/${organizationId}`);
    } catch (error) {
      console.error('Ошибка получения карты по умолчанию:', error);
      throw error;
    }
  },

  // Создать новую карту предприятия
  async createPlantMap(plantMapData) {
    try {
      return await api.post('/plant-map', plantMapData);
    } catch (error) {
      console.error('Ошибка создания карты предприятия:', error);
      throw error;
    }
  },

  // Обновить карту предприятия
  async updatePlantMap(plantMapId, plantMapData) {
    try {
      return await api.put(`/plant-map/${plantMapId}`, plantMapData);
    } catch (error) {
      console.error('Ошибка обновления карты предприятия:', error);
      throw error;
    }
  },

  // Добавить элемент на карту
  async addElementToMap(plantMapId, elementData) {
    try {
      return await api.post(`/plant-map/${plantMapId}/elements`, elementData);
    } catch (error) {
      console.error('Ошибка добавления элемента на карту:', error);
      throw error;
    }
  },

  // Обновить позицию элемента на карте
  async updateElementPosition(elementId, positionX, positionY) {
    try {
      return await api.put(`/plant-map/elements/${elementId}/position?positionX=${positionX}&positionY=${positionY}`);
    } catch (error) {
      console.error('Ошибка обновления позиции элемента:', error);
      throw error;
    }
  },

  // Удалить элемент с карты
  async removeElementFromMap(elementId) {
    try {
      return await api.delete(`/plant-map/elements/${elementId}`);
    } catch (error) {
      console.error('Ошибка удаления элемента с карты:', error);
      throw error;
    }
  },

  // Добавить цех на карту
  async addWorkshopToMap(plantMapId, workshopData) {
    try {
      return await api.post(`/plant-map/${plantMapId}/workshops`, workshopData);
    } catch (error) {
      console.error('Ошибка добавления цеха на карту:', error);
      throw error;
    }
  },

  // Обновить цех на карте
  async updateWorkshop(workshopId, workshopData) {
    try {
      return await api.put(`/plant-map/workshops/${workshopId}`, workshopData);
    } catch (error) {
      console.error('Ошибка обновления цеха:', error);
      throw error;
    }
  },

  // Удалить цех с карты
  async removeWorkshopFromMap(workshopId) {
    try {
      return await api.delete(`/plant-map/workshops/${workshopId}`);
    } catch (error) {
      console.error('Ошибка удаления цеха с карты:', error);
      throw error;
    }
  },

  // Получить список доступного сварочного оборудования для организации
  async getAvailableWeldingMachines(organizationId) {
    try {
      return await api.get(`/plant-map/available-equipment/${organizationId}`);
    } catch (error) {
      console.error('Ошибка получения доступного оборудования:', error);
      throw error;
    }
  },

  // Получить список всех организаций (используем существующий метод)
  async getOrganizations() {
    try {
      return await api.getOrganizations();
    } catch (error) {
      console.error('Ошибка получения организаций:', error);
      throw error;
    }
  }
};

export default plantMapApi;
