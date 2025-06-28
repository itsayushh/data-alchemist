'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Worker, Task } from '@/utils/validation';
import { Rule } from '@/utils/rule';

export interface Priorities {
  PriorityLevel: number;
  Fairness: number;
  Fulfillment: number;
}

export interface DataState {
  clients: Client[];
  workers: Worker[];
  tasks: Task[];
  rules: Rule[];
  priorities: Priorities;
  isDataLoaded: boolean;
}

interface DataContextType {
  data: DataState;
  setClients: (clients: Client[]) => void;
  setWorkers: (workers: Worker[]) => void;
  setTasks: (tasks: Task[]) => void;
  setRules: (rules: Rule[]) => void;
  setPriorities: (priorities: Priorities) => void;
  clearData: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY = 'digitalyz_data';

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<DataState>({
    clients: [],
    workers: [],
    tasks: [],
    rules: [],
    priorities: { PriorityLevel: 40, Fairness: 35, Fulfillment: 25 },
    isDataLoaded: false
  });

  // Load data from localStorage on component mount
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const setClients = (clients: Client[]) => {
    setData(prev => ({ ...prev, clients, isDataLoaded: checkIfDataLoaded(clients, prev.workers, prev.tasks) }));
  };

  const setWorkers = (workers: Worker[]) => {
    setData(prev => ({ ...prev, workers, isDataLoaded: checkIfDataLoaded(prev.clients, workers, prev.tasks) }));
  };

  const setTasks = (tasks: Task[]) => {
    setData(prev => ({ ...prev, tasks, isDataLoaded: checkIfDataLoaded(prev.clients, prev.workers, tasks) }));
  };

  const setRules = (rules: Rule[]) => {
    setData(prev => ({ ...prev, rules }));
  };

  const setPriorities = (priorities: Priorities) => {
    setData(prev => ({ ...prev, priorities }));
  };

  const clearData = () => {
    setData({
      clients: [],
      workers: [],
      tasks: [],
      rules: [],
      priorities: { PriorityLevel: 40, Fairness: 35, Fulfillment: 25 },
      isDataLoaded: false
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  const checkIfDataLoaded = (clients: Client[], workers: Worker[], tasks: Task[]): boolean => {
    return clients.length > 0 && workers.length > 0 && tasks.length > 0;
  };

  const saveToLocalStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  };

  const loadFromLocalStorage = (): boolean => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setData({
          ...parsedData,
          isDataLoaded: checkIfDataLoaded(parsedData.clients, parsedData.workers, parsedData.tasks)
        });
        return true;
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
    return false;
  };

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    if (data.isDataLoaded) {
      saveToLocalStorage();
    }
  }, [data]);

  return (
    <DataContext.Provider value={{
      data,
      setClients,
      setWorkers,
      setTasks,
      setRules,
      setPriorities,
      clearData,
      saveToLocalStorage,
      loadFromLocalStorage
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
