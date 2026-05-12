import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TeachersPage from './pages/TeachersPage';
import TeacherSlotsPage from './pages/TeacherSlotsPage';
import BookingFormPage from './pages/BookingFormPage';
import LoginPage from './pages/LoginPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import MyTimesPage from './pages/MyTimesPage';
import RegistrationsPage from './pages/RegistrationsPage';
import TeacherRegisterPage from './pages/TeacherRegisterPage';
import ParentLoginPage from './pages/ParentLoginPage';
import ParentRegisterPage from './pages/ParentRegisterPage';
import ParentDashboardPage from './pages/ParentDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

const getFallbackPath = (userType) => {
  if (userType === 'teacher') {
    return '/teacher/dashboard';
  }
  if (userType === 'admin') {
    return '/admin/dashboard';
  }
  return '/parent/login';
};

const RequireParent = ({ children }) => {
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');

  if (!token || userType !== 'parent') {
    return <Navigate to={getFallbackPath(userType)} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/teachers" element={<RequireParent><TeachersPage /></RequireParent>} />
          <Route path="/teachers/:teacherId" element={<RequireParent><TeacherSlotsPage /></RequireParent>} />
          <Route path="/book" element={<RequireParent><BookingFormPage /></RequireParent>} />
          <Route path="/book/:slotId" element={<RequireParent><BookingFormPage /></RequireParent>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/teacher/register" element={<TeacherRegisterPage />} />
          <Route path="/parent/login" element={<ParentLoginPage />} />
          <Route path="/parent/register" element={<ParentRegisterPage />} />
          <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="/teacher/my-times" element={<MyTimesPage />} />
          <Route path="/teacher/registrations" element={<RegistrationsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
