/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react'
import { supabase } from './utils/supabase'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { AdminDashboard } from './pages/AdminDashboard'
import { ReaderPage } from './pages/ReaderPage'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  const [todos, setTodos] = useState<any[]>([])

  useEffect(() => {
    async function getTodos() {
      if (!supabase) return;
      const { data: todos } = await supabase.from('todos').select()

      if (todos) {
        setTodos(todos)
      }
    }

    getTodos()
  }, [])

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
            <Route path="/todos" element={
              <div className="p-10">
                <h1 className="text-2xl font-bold mb-4">Supabase Todos Test</h1>
                <ul className="list-disc pl-5">
                  {todos.map((todo) => (
                    <li key={todo.id}>{todo.name}</li>
                  ))}
                  {todos.length === 0 && <li>No todos found.</li>}
                </ul>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
