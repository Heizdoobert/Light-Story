/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminDashboard } from './pages/AdminDashboard';
import { ReaderPage } from './pages/ReaderPage';
import { HomePage } from './pages/HomePage';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Toaster position="top-right" duration={5000} richColors />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'employee']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/story/:storyId/chapter/:chapterId" element={<ReaderPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
