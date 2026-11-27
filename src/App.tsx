import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/context/AuthProvider'
import AddRepositoryPage from '@/pages/AddRepositoryPage'
import ChatPage from '@/pages/ChatPage'
import RegisterPage from '@/pages/RegisterPage'
import RepositoryDetailsPage from '@/pages/RepositoryDetailsPage'
import SignInPage from '@/pages/SignInPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/repositories/new" element={<AddRepositoryPage />} />
          <Route path="/repositories/:id" element={<RepositoryDetailsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
