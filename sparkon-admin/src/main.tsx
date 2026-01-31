import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css'
import LandingPage from './landing'
import AdminLogin from './adminlogin';
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
  <StrictMode>
    {/* Rule 1 : If URL is "/" (Home) , show LandingPage */}
    <Routes>
        <Route path="/" element={<LandingPage/>}/>
        <Route path="/admin/login" element={<AdminLogin/>}/>



    </Routes>
  </StrictMode>,
  </BrowserRouter>
)
