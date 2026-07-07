'use client';

import { useState, useEffect } from 'react';

export default function RegistrationPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    age: ''
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      setQrCodeImageUrl(data?.settings?.qrCodeImageUrl || '');
    } catch (err) {
      console.error('Failed to fetch status', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenderSelect = (gender: string) => {
    if (status?.status?.isMaleFull && gender === 'Male') return;
    if (status?.status?.isFemaleFull && gender === 'Female') return;
    setFormData({ ...formData, gender });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.phone || !formData.gender || !screenshot) {
      setError('Please fill all fields and upload the payment screenshot.');
      return;
    }
    if (!formData.age || Number.isNaN(Number(formData.age))) {
      setError('Please provide a valid age.');
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('phone', formData.phone);
      form.append('gender', formData.gender);
      form.append('age', formData.age);
      form.append('screenshot', screenshot);

      const res = await fetch('/api/register', {
        method: 'POST',
        body: form
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <h2 className="title-3d">Loading...</h2>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="premium-card" style={{ textAlign: 'center', width: '100%' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--success)', marginBottom: '1rem' }}>Registration Successful!</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Thank you, {successData.name}.</p>
          <div style={{ background: '#f7fafc', padding: '2rem', borderRadius: '10px', border: '2px dashed #cbd5e0' }}>
            <p style={{ fontSize: '1rem', color: '#718096', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>Your Registration ID</p>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-dark)' }}>{successData.registrationId}</h1>
          </div>
          <p style={{ marginTop: '2rem', color: '#718096' }}>Please save this ID for your records.</p>
        </div>
      </div>
    );
  }

  const isClosed = status?.status?.isRegistrationFull || !status?.status?.isOpen;

  return (
    <div className="container animate-fade-in">
      <h1 className="title-3d">the B'S <span className="dark">CLUB</span></h1>
      <h3 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-light)', letterSpacing: '2px', fontWeight: 700 }}>FOR BADMINTON BUDDIES</h3>

      <div className="premium-card">
        {isClosed ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--error)' }}>Registration is Closed</h2>
            <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>We have reached the maximum number of participants. Thank you for your interest!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                name="name" 
                className="form-control" 
                placeholder="Enter your full name" 
                value={formData.name} 
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="tel" 
                name="phone" 
                className="form-control" 
                placeholder="Enter your phone number" 
                value={formData.phone} 
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <div className="radio-group">
                <div 
                  className={`radio-card ${formData.gender === 'Male' ? 'selected' : ''}`}
                  style={{ opacity: status?.status?.isMaleFull ? 0.5 : 1, cursor: status?.status?.isMaleFull ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleGenderSelect('Male')}
                >
                  Male
                  {status?.status?.isMaleFull && <div style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '0.5rem' }}>Full</div>}
                </div>
                <div 
                  className={`radio-card ${formData.gender === 'Female' ? 'selected' : ''}`}
                  style={{ opacity: status?.status?.isFemaleFull ? 0.5 : 1, cursor: status?.status?.isFemaleFull ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleGenderSelect('Female')}
                >
                  Female
                  {status?.status?.isFemaleFull && <div style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '0.5rem' }}>Full</div>}
                </div>
              </div>
            </div>

            <div className="qr-section">
              <h3 style={{ marginBottom: '1rem' }}>Scan to Pay</h3>
              {qrCodeImageUrl ? (
                <img src={qrCodeImageUrl} alt="Payment QR Code" style={{ width: '200px', height: '200px', objectFit: 'contain', margin: '0 auto 1rem', borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0' }} />
              ) : (
                <div style={{ width: '200px', height: '200px', background: '#e2e8f0', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                  <span style={{ color: '#718096', fontWeight: 700 }}>QR Code Placeholder</span>
                </div>
              )}
              <p style={{ fontSize: '0.9rem', color: '#4a5568' }}>Please complete the payment and upload the screenshot below.</p>
            </div>

            <div className="form-group">
              <div className="file-upload-wrapper">
                <div className="file-upload-btn">
                  {screenshot ? screenshot.name : 'Upload Payment Screenshot'}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  disabled={submitting}
                />
              </div>
            </div>

            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Now'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
