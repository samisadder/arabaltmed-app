import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewInvoice from './pages/NewInvoice.jsx';
import InvoiceDetail from './pages/InvoiceDetail.jsx';
import InvoicePay from './pages/InvoicePay.jsx';
import Settings from './pages/Settings.jsx';
import { isLoggedIn } from './lib/api.js';

function PrivateRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/admin/invoices/new" element={<PrivateRoute><NewInvoice /></PrivateRoute>} />
        <Route path="/admin/invoices/:id" element={<PrivateRoute><InvoiceDetail /></PrivateRoute>} />
        <Route path="/admin/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/invoice/:token" element={<InvoicePay />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
