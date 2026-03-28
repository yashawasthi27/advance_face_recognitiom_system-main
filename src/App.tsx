import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Register from './pages/Register';
import Attendance from './pages/Attendance';
import Records from './pages/Records';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import DownloadRecord from './pages/DownloadRecord';
import PasswordGuard from './components/PasswordGuard';
import { useEffect } from 'react';
import { loadModels } from './utils/faceApi';

function App() {
  useEffect(() => {
    loadModels();
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={
            <PasswordGuard>
              <Register />
            </PasswordGuard>
          } />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/records" element={
            <PasswordGuard>
              <Records />
            </PasswordGuard>
          } />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/download" element={<DownloadRecord />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
