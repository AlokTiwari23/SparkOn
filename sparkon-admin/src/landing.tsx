import React from 'react';
import {
    Download, Zap, ShoppingCart, FileText, Lock,
    Smartphone, Truck, Percent, ClipboardList, ChevronRight
} from 'lucide-react';
import './Landing.css';
import { Link } from 'react-router-dom';
const LandingPage = () => {
    const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.bajrang.electric";
    const ADMIN_URL = "/admin/login";
    // Using your logo URL
    const LOGO_URL = "https://res.cloudinary.com/dg6vd2shw/image/upload/v1769760480/svgviewer-output_2_jwytyg.svg";

    return (
        <div className="landing-container">
            <div className="content-container">

                {/* --- NAVBAR --- */}
                <nav className="navbar">
                    <div className="brand">
                        <img src={LOGO_URL} alt="SparkOn Logo" className="brand-logo" />

                    </div>
                    <div className="nav-links">
                        <a href="#store">Shop</a>
                        <a href="#tools">Business Tools</a>
                        <a href="#how-it-works">How it Works</a>
                    </div>
                </nav>

                {/* --- HERO SECTION --- */}
                <main className="hero">
                    <div className="badge">
                        <span className="dot"></span>
                        <span>Official App of Bajrang Electric Store</span>
                    </div>

                    <h1>
                        Your Pocket <br />
                        <span className="highlight">Electrical Wholesaler</span>
                    </h1>

                    <p className="subtitle">
                        Order original wires, switches, and lights at wholesale prices directly from your phone.
                        Plus, create professional bills for your own customers instantly.
                    </p>

                    <div className="hero-buttons">
                        <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className="cta-button">
                            <Download size={24} />
                            <span>Download App</span>
                        </a>
                        <a href="#store" className="secondary-button">
                            <span>View Products</span>
                        </a>
                    </div>

                    {/* --- APP MOCKUP (Visual) --- */}
                    <div>
                        <div style={{
                            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                            border: '1px solid #334155',
                            padding: '1rem',
                            borderRadius: '32px',
                            width: '300px',
                            height: '600px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* This represents your App Screen */}
                            <div style={{ textAlign: 'center', zIndex: 10 }}>
                                <ShoppingCart size={56} color="#facc15" style={{ margin: '0 auto 1.5rem' }} />
                                <h3 style={{ color: 'white', marginBottom: '10px' }}>Bajrang Electric Store</h3>
                                <p style={{ fontSize: '0.9rem' }}>Welcome, Alok</p>

                                {/* Fake Product List Visual */}
                                <div style={{ marginTop: '2rem', textAlign: 'left', width: '220px' }}>
                                    <div style={{ background: '#334155', height: '10px', width: '60%', borderRadius: '4px', marginBottom: '8px' }}></div>
                                    <div style={{ background: '#334155', height: '10px', width: '80%', borderRadius: '4px', marginBottom: '20px' }}></div>

                                    <div style={{ background: '#334155', height: '60px', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '10px' }}>
                                        <div style={{ width: '30px', height: '30px', background: '#475569', borderRadius: '4px' }}></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ height: '6px', width: '70%', background: '#94a3b8', marginBottom: '6px' }}></div>
                                            <div style={{ height: '6px', width: '40%', background: '#64748b' }}></div>
                                        </div>
                                    </div>
                                    <div style={{ background: '#334155', height: '60px', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', padding: '0 10px', gap: '10px' }}>
                                        <div style={{ width: '30px', height: '30px', background: '#475569', borderRadius: '4px' }}></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ height: '6px', width: '70%', background: '#94a3b8', marginBottom: '6px' }}></div>
                                            <div style={{ height: '6px', width: '40%', background: '#64748b' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Circles */}
                            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '180px', height: '180px', background: 'radial-gradient(#eab30833, transparent 70%)', borderRadius: '50%' }}></div>
                        </div>
                    </div>

                </main>

                {/* --- STORE FEATURES --- */}
                <section id="store" className="section">
                    <div className="section-header">
                        <h2 className="section-title">Buy Supplies for Your Sites</h2>
                        <p className="section-desc">Why go to the market? Order everything you need for your electrical projects from Bajrang Electric Store app.</p>
                    </div>
                    <div className="features-grid">
                        <FeatureCard
                            icon={<ShoppingCart color="#facc15" />}
                            title="Wide Range of Products"
                            desc="Wires, cables, switches, holders, MCBs, and fancy lights. Everything available in one place."
                        />
                        <FeatureCard
                            icon={<Percent color="#22c55e" />}
                            title="Electrician Special Rates"
                            desc="Get exclusive wholesale prices and discounts that are not available to normal customers."
                        />
                        <FeatureCard
                            icon={<Truck color="#3b82f6" />}
                            title="Fast Site Delivery"
                            desc="We deliver material directly to your working site so you don't have to stop your work."
                        />
                    </div>
                </section>

                {/* --- BUSINESS TOOLS --- */}
                <section id="tools" className="section" style={{ borderTop: 'none', paddingTop: '2rem' }}>
                    <div className="section-header">
                        <h2 className="section-title">Manage Your Business</h2>
                        <p className="section-desc">SparkOn isn't just a shop. It's a complete manager for your electrical contracting business.</p>
                    </div>
                    <div className="features-grid">
                        <FeatureCard
                            icon={<FileText color="#f97316" />}
                            title="Digital Invoices"
                            desc="Create professional PDF bills for your clients with your name and logo. Send via WhatsApp instantly."
                        />
                        <FeatureCard
                            icon={<ClipboardList color="#a855f7" />}
                            title="Project Management"
                            desc="Keep track of material used at different sites (Ramesh Ji's House, School Project, etc.)."
                        />
                        <FeatureCard
                            icon={<Zap color="#ef4444" />}
                            title="Voice-to-Invoice"
                            desc="Just speak the item names, and our smart AI will create the item list for you automatically."
                        />
                    </div>
                </section>

                {/* --- HOW IT WORKS SECTION --- */}
                <section id="how-it-works" className="section">
                    <div className="section-header">
                        <h2 className="section-title">How to Start?</h2>
                    </div>
                    <div className="steps-grid">
                        <StepCard
                            number="01"
                            title="Register"
                            desc="Download the app and login with your mobile number to get verified."
                            hasArrow={true}
                        />
                        <StepCard
                            number="02"
                            title="Order Material"
                            desc="Browse the catalog and order items for your current electrical site."
                            hasArrow={true}
                        />
                        <StepCard
                            number="03"
                            title="Bill Client"
                            desc="Add your margin and generate a final invoice for your customer."
                        />
                    </div>
                </section>

                {/* --- FINAL CTA SECTION --- */}
                <section className="section cta-section">
                    <div className="section-header" style={{ marginBottom: '2rem' }}>
                        <h2 className="section-title" style={{ fontSize: '3rem' }}>Start Saving Today</h2>
                        <p className="section-desc" style={{ fontSize: '1.25rem' }}>Join the community of smart electricians using SparkOn.</p>
                    </div>
                    <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className="cta-button" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
                        <Download size={28} />
                        <span>Download for Android</span>
                    </a>
                </section>

               
            </div>

            {/* 🕵️ SECRET ADMIN BUTTON */}
            {/* --- FOOTER --- */}
            <footer className="footer">
                <p>&copy; {new Date().getFullYear()} Bajrang Electric Store. All rights reserved.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '10px', opacity: 0.6 }}>Fatehpur, Gorakhpur, Uttar Pradesh</p>

                {/* 🔒 ADMIN LOGIN LINK 
      This is styled to be small and gray so it blends in with the footer 
      and doesn't distract normal customers.
  */}
                <div style={{ marginTop: '1.5rem' }}>
                    <Link   
                        to={ADMIN_URL}
                        className="admin-text-link"
                        title='Admin Login'
                    >
                        Admin Panel Access
                    </Link>
                </div>
            </footer>
        </div>
    );
};

// Helper Component for Features
const FeatureCard = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="feature-card">
        <div className="card-icon-box">
            {React.cloneElement(icon, { size: 28 })}
        </div>
        <h3>{title}</h3>
        <p>{desc}</p>
    </div>
);

// Helper Component for Steps
const StepCard = ({ number, title, desc, hasArrow }: { number: string, title: string, desc: string, hasArrow?: boolean }) => (
    <div className="step-card">
        <span className="step-number">{number}</span>
        <h3>{title}</h3>
        <p>{desc}</p>
        {hasArrow && <ChevronRight className="step-arrow" size={40} />}
    </div>
);

export default LandingPage;