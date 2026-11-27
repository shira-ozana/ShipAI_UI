import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/context/AuthProvider'
import AddRepositoryPage from '@/pages/AddRepositoryPage'
import ChatPage from '@/pages/ChatPage'
import FeaturePage from '@/pages/FeaturePage'
import RegisterPage from '@/pages/RegisterPage'
import RepositoriesPage from '@/pages/RepositoriesPage'
import RepositoryDetailsPage from '@/pages/RepositoryDetailsPage'
import SignInPage from '@/pages/SignInPage'
import TasksPage from '@/pages/TasksPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/repositories" element={<RepositoriesPage />} />
          <Route path="/repositories/new" element={<AddRepositoryPage />} />
          <Route path="/repositories/:id" element={<RepositoryDetailsPage />} />
          <Route path="/repositories/:id/features/:featureId" element={<FeaturePage />} />
          <Route path="/repositories/:id/features/:featureId/tasks" element={<TasksPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
