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
    registeredBefore: '',
    level: '',
    gender: '',
    venue: ''
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

  const handleCategorySelect = async (val: string) => {
    const isVenueMode = status?.settings?.registrationMode === 'VENUE';
    if (isVenueMode) {
      setFormData({ ...formData, venue: val, gender: '' });
    } else {
      setFormData({ ...formData, gender: val, venue: '' });
    }
    setCheckingSlots(true);
    setError('');
    
    try {
      const query = isVenueMode ? `venue=${encodeURIComponent(val)}` : `gender=${val}`;
      const res = await fetch(`/api/check-slots?${query}`);
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

    if (!formData.name || !formData.phone || (!formData.gender && !formData.venue) || !formData.registeredBefore || !formData.level || !screenshot) {
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
      if (formData.gender) form.append('gender', formData.gender);
      if (formData.venue) form.append('venue', formData.venue);
      form.append('age', formData.age);
      form.append('registeredBefore', formData.registeredBefore);
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
        <div className="premium-card" style={{ textAlign: 'center', width: '100%', padding: '3rem 2rem' }}>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--text-dark)', marginBottom: '0.5rem' }}>🎉 Thank you, {successData.name}</h2>
          <h1 style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '2rem' }}>You're In!</h1>
          
          <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#4a5568' }}>Welcome to The B's Club.</p>
          <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#4a5568' }}>Your registration has been successfully confirmed.</p>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#4a5568', fontWeight: 700 }}>We'll see you on the court this weekend!</p>
          <button onClick={() => window.location.reload()} className="btn" style={{ maxWidth: '200px', margin: '0 auto' }}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <h1 className="title-3d">the B'S <span className="dark">CLUB</span></h1>
      <h3 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-light)', letterSpacing: '2px', fontWeight: 700 }}>FOR BADMINTON BUDDIES</h3>

      {status?.settings?.announcementEnabled && status?.settings?.announcementTitle && (
        <div className="premium-card animate-fade-in" style={{ marginBottom: '2rem', border: '1px solid rgba(159, 122, 234, 0.3)', borderLeft: '4px solid var(--primary)', padding: '1.5rem', backgroundColor: '#faf5ff', boxShadow: '0 4px 6px rgba(159, 122, 234, 0.1)' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📢</span> {status.settings.announcementTitle}
          </h3>
          <p style={{ color: 'var(--text-dark)', whiteSpace: 'pre-line', lineHeight: 1.6, fontSize: '1.05rem' }}>
            {status.settings.announcementMessage}
          </p>
        </div>
      )}

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
              <label>Have you registered with The B's Club before?</label>
              <div className="radio-group">
                <div 
                  className={`radio-card ${formData.registeredBefore === 'Yes' ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, registeredBefore: 'Yes' })}
                  style={{ opacity: submitting ? 0.7 : 1, pointerEvents: submitting ? 'none' : 'auto' }}
                >
                  Yes
                </div>
                <div 
                  className={`radio-card ${formData.registeredBefore === 'No' ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, registeredBefore: 'No' })}
                  style={{ opacity: submitting ? 0.7 : 1, pointerEvents: submitting ? 'none' : 'auto' }}
                >
                  No
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Level</label>
              <select 
                name="level" 
                className="form-control" 
                value={formData.level} 
                onChange={handleChange as any}
                disabled={submitting}
              >
                <option value="" disabled>Select your playing level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label>{status?.settings?.registrationMode === 'VENUE' ? 'Venue / Time' : 'Gender'}</label>
              <div className="radio-group">
                {status?.settings?.registrationMode === 'VENUE' ? (
                  <>
                    <div 
                      className={`radio-card ${formData.venue === status?.settings?.venue1Name ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect(status?.settings?.venue1Name || 'Venue 1')}
                      style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1, padding: '1rem', fontSize: '0.95rem' }}
                    >
                      {status?.settings?.venue1Name || 'Venue 1'}
                    </div>
                    <div 
                      className={`radio-card ${formData.venue === status?.settings?.venue2Name ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect(status?.settings?.venue2Name || 'Venue 2')}
                      style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1, padding: '1rem', fontSize: '0.95rem' }}
                    >
                      {status?.settings?.venue2Name || 'Venue 2'}
                    </div>
                  </>
                ) : (
                  <>
                    <div 
                      className={`radio-card ${formData.gender === 'Male' ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect('Male')}
                      style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1 }}
                    >
                      Male
                    </div>
                    <div 
                      className={`radio-card ${formData.gender === 'Female' ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect('Female')}
                      style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1 }}
                    >
                      Female
                    </div>
                  </>
                )}
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
