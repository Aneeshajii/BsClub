'use client';

import { useState, useEffect } from 'react';

export default function RegistrationPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState('');

  const [checkingSlots, setCheckingSlots] = useState(false);
  const [slotAvailable, setSlotAvailable] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    district: '',
    level: '',
    gender: ''
  });

  const [screenshot, setScreenshot] = useState<File | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedQr = sessionStorage.getItem('bsclub-public-qr');
    if (storedQr) {
      setQrCodeImageUrl(storedQr);
    }
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      const nextQrCodeImageUrl = data?.settings?.qrCodeImageUrl || '';
      setQrCodeImageUrl(nextQrCodeImageUrl);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bsclub-public-qr', nextQrCodeImageUrl);
      }
      
      if (data?.status?.isRegistrationFull || !data?.status?.isOpen) {
        setIsClosed(true);
      }
    } catch (err) {
      console.error('Failed to fetch status', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenderSelect = async (gender: string) => {
    setFormData({ ...formData, gender });
    setCheckingSlots(true);
    setError('');
    
    try {
      const res = await fetch(`/api/check-slots?gender=${gender}`);
      const data = await res.json();
      if (data.available) {
        setSlotAvailable(true);
      } else {
        setIsClosed(true);
      }
    } catch (err) {
      setError('Failed to check availability. Please try again.');
    } finally {
      setCheckingSlots(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Vercel Serverless limit is 4.5MB. We block it here to prevent HTML error crash.
      if (file.size > 4.5 * 1024 * 1024) {
        setError('Image is too large. Please upload a file smaller than 4.5MB.');
        setScreenshot(null);
        e.target.value = '';
        return;
      }
      setError('');
      setScreenshot(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.phone || !formData.gender || !formData.district || !formData.level || !screenshot) {
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
      form.append('district', formData.district);
      form.append('level', formData.level);
      form.append('screenshot', screenshot);

      const res = await fetch('/api/register', {
        method: 'POST',
        body: form
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Upload failed. The image might be too large or the server is busy.");
      }

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

  return (
    <div className="container animate-fade-in">
      <h1 className="title-3d">the B'S <span className="dark">CLUB</span></h1>
      <h3 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-light)', letterSpacing: '2px', fontWeight: 700 }}>FOR BADMINTON BUDDIES</h3>

      <div className="premium-card">
        {isClosed ? (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <h2 style={{ fontSize: '2.2rem', color: 'var(--text-dark)', marginBottom: '1.5rem', letterSpacing: '1px' }}>Registrations Closed</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#4a5568' }}>Thank you for your interest in joining B's Club.</p>
            <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#4a5568' }}>Unfortunately, registrations for this session have reached full capacity.</p>
            <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#4a5568' }}>We truly appreciate your enthusiasm and look forward to welcoming you at one of our upcoming weekend sessions.</p>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#4a5568' }}>Please check back next week when registrations reopen.<br/><br/><strong>See you on court!</strong></p>
            <button onClick={() => window.location.reload()} className="btn" style={{ maxWidth: '200px', margin: '0 auto' }}>Back to Home</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="animate-fade-in">
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
              <label>Age</label>
              <input
                type="number"
                name="age"
                className="form-control"
                placeholder="Enter your age"
                value={formData.age}
                onChange={handleChange}
                disabled={submitting}
                min={1}
              />
            </div>

            <div className="form-group">
              <label>District</label>
              <input 
                type="text" 
                name="district" 
                className="form-control" 
                placeholder="Enter your district" 
                value={formData.district} 
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Level</label>
              <input 
                type="text" 
                name="level" 
                className="form-control" 
                placeholder="Enter your playing level" 
                value={formData.level} 
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <div className="radio-group">
                <div 
                  className={`radio-card ${formData.gender === 'Male' ? 'selected' : ''}`}
                  onClick={() => handleGenderSelect('Male')}
                  style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1 }}
                >
                  Male
                </div>
                <div 
                  className={`radio-card ${formData.gender === 'Female' ? 'selected' : ''}`}
                  onClick={() => handleGenderSelect('Female')}
                  style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1 }}
                >
                  Female
                </div>
              </div>
              {checkingSlots && <div style={{ textAlign: 'center', marginTop: '1rem', color: '#718096', fontStyle: 'italic' }}>Checking slot availability...</div>}
            </div>

            {slotAvailable && (
              <div className="animate-fade-in" style={{ animationDuration: '0.8s' }}>
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
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
