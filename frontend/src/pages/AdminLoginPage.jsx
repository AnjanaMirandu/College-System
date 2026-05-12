import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/admin/login', {
        email: email.trim(),
        password: password.trim(),
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userType', 'admin');
      localStorage.setItem('userName', res.data.admin.name);
      localStorage.setItem('userEmail', res.data.admin.email);
      navigate('/admin/dashboard');
    } catch (error) {
      alert(error?.response?.data?.message || 'Unable to log in as admin');
    }
  };

  return (
    <div className="App">
      <Navbar />
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">Admin Login</h1>
          <p className="page-subtitle">Sign in to manage teachers, parents, bookings, and appointment slots across the whole site.</p>
        </header>
        <div className="form-card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="button-primary" type="submit">Login as Admin</button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;
