import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.jsx';
import './styles.css';

const androidPreview = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('platform') === 'android';

if (Capacitor.isNativePlatform() || androidPreview) {
  document.documentElement.classList.add('capacitor-native');
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
