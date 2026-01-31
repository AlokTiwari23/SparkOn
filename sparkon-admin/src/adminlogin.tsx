import React, { useState } from 'react';
import { Lock, Mail, Key, ArrowLeft, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import './adminlogin.css';
import axios from "axios"
import dotenv from "dotenv"
dotenv.config()

const AdminLogin = () => {
  const navigate = useNavigate();

  // State variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Form Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // --- TODO: REPLACE THIS WITH YOUR REAL API CALL LATER ---
    // Example: await axios.post('/api/admin/login', { email, password })

    try {
      const response = await axios.post(`${process.env.URL}/api/admin-login`, { email: email, password: password })

      if (response.data.accessToken) {
        localStorage.setItem('adminToken', response.data.accessToken);
        // navigate('/dashboard');
      }
      if (response.data.admin) {
        localStorage.setItem('admin', JSON.stringify(response.data.admin))
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
      alert("Login Successful"); // Optional
      navigate('/dashboard');

    } catch (error: any) {
      const message = error.response?.data?.message || "Login failed. Please try again.";

      setError(message);
      // Trigger the shake animation
    } finally {
      setIsLoading(false);
    }

    setTimeout(() => {
      // Mock validation
      if (email === 'admin@sparkon.com' && password === 'admin123') {
        alert('Login Successful!');
        // navigate('/dashboard'); // Uncomment when you have a dashboard
      } else {
        setError('Invalid credentials. Access denied.');
      }
      setIsLoading(false);
    }, 1500);
    // -------------------------------------------------------
  };

  return (
    <div className="login-container">
      <div className="login-card">

        {/* Header with Icon */}
        <div className="login-header">
          <div className="icon-circle">
            <Lock size={32} color="#eab308" />
          </div>
          <h2>Admin Access</h2>
          <p>Secure login for SparkOn Managers</p>
        </div>

        {/* Error Message Box (Only shows if there is an error) */}
        {error && (
          <div className="error-box">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>

          {/* Email Field */}
          <div className="input-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                placeholder="admin@sparkon.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Key className="input-icon" size={20} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                Secure Login
              </>
            )}
          </button>

        </form>

        {/* Footer / Back Link */}
        <div className="login-footer">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            Return to Website
          </Link>
        </div>

      </div>
    </div>
  );
};

export default AdminLogin;