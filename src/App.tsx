import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResumeSkillsPage } from './pages/ResumeSkillsPage';
import { AssessmentHubPage } from './pages/AssessmentHubPage';
import { QuizPage } from './pages/QuizPage';
import { QuizResultsPage } from './pages/QuizResultsPage';
import { SkillGapPage } from './pages/SkillGapPage';
import { CareerPathPage } from './pages/CareerPathPage';
import { LearningOutcomesPage } from './pages/LearningOutcomesPage';
import { SkillLearningPage } from './pages/SkillLearningPage';
import { TodaysTechPage } from './pages/TodaysTechPage';
import { PremiumPage } from './pages/PremiumPage';
import { ProfilePage } from './pages/ProfilePage';
import { InstallAppPrompt } from './components/common/InstallAppPrompt';

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Dashboard Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/resume" element={<ResumeSkillsPage />} />
            <Route path="/assessment" element={<AssessmentHubPage />} />
            <Route path="/assessment/:quizId" element={<QuizPage />} />
            <Route path="/results" element={<QuizResultsPage />} />
            <Route path="/skill-gap" element={<SkillGapPage />} />
            <Route path="/career-path" element={<CareerPathPage />} />
            <Route path="/learning" element={<LearningOutcomesPage />} />
            <Route path="/learning/skill/:skillName" element={<SkillLearningPage />} />
            <Route path="/todays-tech" element={<TodaysTechPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <InstallAppPrompt />
      </Router>
    </AuthProvider>
  );
}

export default App;
