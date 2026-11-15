import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f1f1f',
            color: '#f5f5f0',
            border: '1px solid #2e2e2e',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
          },
          success: {
            iconTheme: {
              primary: '#52b788',
              secondary: '#1f1f1f',
            },
          },
          error: {
            iconTheme: {
              primary: '#c0392b',
              secondary: '#1f1f1f',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
