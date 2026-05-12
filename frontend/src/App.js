import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/teachers/:teacherId" element={<TeacherSlotsPage />} />
          <Route path="/book" element={<BookingFormPage />} />
          <Route path="/book/:slotId" element={<BookingFormPage />} />
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
