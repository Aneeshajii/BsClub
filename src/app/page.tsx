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
    email: '',
    age: '',
    registeredBefore: '',
    level: '',
    gender: '',
    venue: '',
    tournamentCategory: '',
    partnerName: '',
    partnerEmail: '',
    partnerAge: '',
    partnerLevel: '',
    playingMixedDoubles: false,
    mixedPartnerName: '',
    mixedPartnerEmail: '',
    mixedPartnerAge: '',
    mixedPartnerLevel: ''
  });

  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [partnerPhoto, setPartnerPhoto] = useState<File | null>(null);
  const [mixedPartnerPhoto, setMixedPartnerPhoto] = useState<File | null>(null);

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

  const handleCategorySelect = async (type: 'VENUE' | 'GENDER', val: string) => {
    const isVenueAndGender = status?.settings?.registrationMode === 'VENUE_AND_GENDER';
    const isTournament = status?.settings?.registrationMode === 'TOURNAMENT';
    
    let newFormData = { ...formData };
    if (isTournament) {
      newFormData.tournamentCategory = val;
      newFormData.venue = '';
      newFormData.gender = '';
      setFormData(newFormData);
    } else if (isVenueAndGender) {
      if (type === 'VENUE') {
        newFormData.venue = val;
        newFormData.gender = ''; // Reset gender when venue changes
        setSlotAvailable(false);
        setIsClosed(false);
        setFormData(newFormData);
        return; // Don't check slots yet, wait for gender
      } else {
        newFormData.gender = val;
        setFormData(newFormData);
      }
    } else {
      if (type === 'VENUE') {
        newFormData.venue = val;
        newFormData.gender = '';
      } else {
        newFormData.gender = val;
        newFormData.venue = '';
      }
      setFormData(newFormData);
    }
    
    setCheckingSlots(true);
    setError('');
    
    try {
      let query = '';
      if (isTournament) {
        query = `tournamentCategory=${encodeURIComponent(newFormData.tournamentCategory)}`;
      } else if (isVenueAndGender) {
        query = `venue=${encodeURIComponent(newFormData.venue)}&gender=${newFormData.gender}`;
      } else {
        query = newFormData.venue ? `venue=${encodeURIComponent(newFormData.venue)}` : `gender=${newFormData.gender}`;
      }
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

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.7);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      
      if (file.type.startsWith('image/')) {
        try {
          file = await compressImage(file);
        } catch (err) {
          console.error("Compression failed", err);
        }
      }

      if (file.size > 4.5 * 1024 * 1024) {
        setError('Image is still too large. Please use a smaller file under 4.5MB.');
        setter(null);
        e.target.value = '';
        return;
      }
      
      setError('');
      setter(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isTournament = status?.settings?.registrationMode === 'TOURNAMENT';

    if (isTournament) {
      if (!formData.name || !formData.phone || !formData.tournamentCategory || !formData.registeredBefore || !formData.level || !screenshot || !formData.partnerName || !formData.partnerLevel || !userPhoto || !partnerPhoto) {
        setError('Please fill all required fields and upload all required images.');
        return;
      }
      if (!formData.email || !formData.partnerEmail) {
        setError('Please provide email addresses for both players.');
        return;
      }

      if (formData.playingMixedDoubles) {
        if (!formData.mixedPartnerName || !formData.mixedPartnerLevel || !mixedPartnerPhoto) {
          setError('Please fill all Mixed Doubles partner details and upload their image.');
          return;
        }
        if (!formData.mixedPartnerEmail) {
          setError('Please provide an email address for your Mixed Doubles partner.');
          return;
        }
      }
    } else {
      if (!formData.name || !formData.phone || (!formData.gender && !formData.venue) || !formData.registeredBefore || !formData.level || !screenshot) {
        setError('Please fill all fields and upload the payment screenshot.');
        return;
      }
      if (!formData.email) {
        setError('Please provide a valid email.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('phone', formData.phone);
      if (formData.gender) form.append('gender', formData.gender);
      if (formData.venue) form.append('venue', formData.venue);
      form.append('email', formData.email);
      if (formData.age) form.append('age', formData.age);
      form.append('registeredBefore', formData.registeredBefore);
      form.append('level', formData.level);
      form.append('screenshot', screenshot);
      
      if (isTournament) {
        form.append('tournamentCategory', formData.tournamentCategory);
        form.append('partnerName', formData.partnerName);
        form.append('partnerEmail', formData.partnerEmail);
        if (formData.partnerAge) form.append('partnerAge', formData.partnerAge);
        form.append('partnerLevel', formData.partnerLevel);
        if (userPhoto) form.append('userPhoto', userPhoto);
        if (partnerPhoto) form.append('partnerPhoto', partnerPhoto);
        
        form.append('playingMixedDoubles', formData.playingMixedDoubles.toString());
        if (formData.playingMixedDoubles) {
          form.append('mixedPartnerName', formData.mixedPartnerName);
          form.append('mixedPartnerEmail', formData.mixedPartnerEmail);
          if (formData.mixedPartnerAge) form.append('mixedPartnerAge', formData.mixedPartnerAge);
          form.append('mixedPartnerLevel', formData.mixedPartnerLevel);
          if (mixedPartnerPhoto) form.append('mixedPartnerPhoto', mixedPartnerPhoto);
        }
      }

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
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse-opacity {
            0% { opacity: 0.5; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1.02); }
            100% { opacity: 0.5; transform: scale(0.98); }
          }
        `}} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', animation: 'pulse-opacity 2s ease-in-out infinite' }}>
          <img src="/bs-club-only.png" alt="B's Club" style={{ maxWidth: '220px', height: 'auto' }} />
          <div style={{ 
            fontSize: '5rem', 
            fontWeight: 900, 
            lineHeight: 1,
            background: 'linear-gradient(135deg, #d08cfc 0%, #f6ad55 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            fontFamily: 'sans-serif'
          }}>X</div>
          <img src="/hndrd-only.png" alt="HNDRD" style={{ maxWidth: '220px', height: 'auto' }} />
        </div>
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
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
        <img src="/form-logo-v6.png" alt="B's Club Logo" style={{ maxWidth: '100%', height: 'auto', maxHeight: '150px', objectFit: 'contain' }} />
      </div>


      {status?.settings?.announcementEnabled && status?.settings?.announcementTitle && (
        <div className="premium-card animate-fade-in" style={{ marginBottom: '2rem', border: '1px solid rgba(208, 140, 252, 0.3)', borderLeft: '4px solid #d08cfc', padding: '1.5rem', backgroundColor: 'transparent' }}>
          <h3 style={{ color: '#d08cfc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📢</span> {status.settings.announcementTitle}
          </h3>
          <p style={{ color: '#fff', whiteSpace: 'pre-line', lineHeight: 1.6, fontSize: '1.05rem' }}>
            {status.settings.announcementMessage}
          </p>
        </div>
      )}

      <div className="premium-card">
        {isClosed ? (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
            <h2 style={{ fontSize: '3.2rem', color: '#d08cfc', marginBottom: '1.5rem', letterSpacing: '1px', fontWeight: 900, lineHeight: 1.1 }}>Registrations<br/>Closed</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#fff', fontWeight: 500 }}>Thank you for your interest in joining<br/>B's Club.</p>
            <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#fff', fontWeight: 500 }}>Unfortunately, registrations for this<br/>session have reached full capacity.</p>
            <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#fff', fontWeight: 500 }}>We truly appreciate your<br/>enthusiasm and look forward to<br/>welcoming you at one of our<br/>upcoming weekend sessions.</p>
            <p style={{ fontSize: '1.2rem', marginBottom: '2.5rem', color: '#fff', fontWeight: 500 }}>Please check back next week when<br/>registrations reopen.<br/><br/><strong style={{ fontSize: '1.4rem' }}>See you on court!</strong></p>
            <button onClick={() => window.location.reload()} className="btn" style={{ maxWidth: '280px', margin: '0 auto', backgroundColor: '#1a0b2e', color: '#fff', border: '2px solid #5a308b', borderRadius: '15px', letterSpacing: '2px', fontWeight: 700 }}>BACK TO HOME</button>
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
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Enter your email address"
                value={formData.email}
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
              <label>
                {status?.settings?.registrationMode === 'TOURNAMENT' 
                  ? 'Tournament Category' 
                  : status?.settings?.registrationMode === 'VENUE_AND_GENDER' 
                    ? 'Venue' 
                    : 'Gender'}
              </label>
              <div className="radio-group">
                {status?.settings?.registrationMode === 'TOURNAMENT' ? (
                  <>
                    {["Men's Doubles", "Women's Doubles", "Mixed Doubles"].map(cat => (
                      <div 
                        key={cat}
                        className={`radio-card ${formData.tournamentCategory === cat ? 'selected' : ''}`}
                        onClick={() => handleCategorySelect('VENUE', cat)}
                        style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1, padding: '1rem', fontSize: '0.95rem' }}
                      >
                        {cat}
                      </div>
                    ))}
                  </>
                ) : status?.settings?.registrationMode === 'VENUE_AND_GENDER' ? (
                  <>
                    <div 
                      className={`radio-card ${formData.venue === status?.settings?.venue1Name ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect('VENUE', status?.settings?.venue1Name || 'Venue 1')}
                      style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1, padding: '1rem', fontSize: '0.95rem' }}
                    >
                      {status?.settings?.venue1Name || 'Venue 1'}
                    </div>
                    <div 
                      className={`radio-card ${formData.venue === status?.settings?.venue2Name ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect('VENUE', status?.settings?.venue2Name || 'Venue 2')}
                      style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1, padding: '1rem', fontSize: '0.95rem' }}
                    >
                      {status?.settings?.venue2Name || 'Venue 2'}
                    </div>
                  </>
                ) : (
                  <>
                    <div 
                      className={`radio-card ${formData.gender === 'Male' ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect('GENDER', 'Male')}
                      style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1 }}
                    >
                      Male
                    </div>
                    <div 
                      className={`radio-card ${formData.gender === 'Female' ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect('GENDER', 'Female')}
                      style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1 }}
                    >
                      Female
                    </div>
                  </>
                )}
              </div>
              {status?.settings?.registrationMode === 'TOURNAMENT' && checkingSlots && (
                <div style={{ textAlign: 'center', marginTop: '1rem', color: '#718096', fontStyle: 'italic' }}>Checking slot availability...</div>
              )}
            </div>

            {status?.settings?.registrationMode === 'VENUE_AND_GENDER' && formData.venue && !isClosed && (
              <div className="form-group animate-fade-in" style={{ animationDuration: '0.4s' }}>
                <label>Gender</label>
                <div className="radio-group">
                  <div 
                    className={`radio-card ${formData.gender === 'Male' ? 'selected' : ''}`}
                    onClick={() => handleCategorySelect('GENDER', 'Male')}
                    style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1 }}
                  >
                    Male
                  </div>
                  <div 
                    className={`radio-card ${formData.gender === 'Female' ? 'selected' : ''}`}
                    onClick={() => handleCategorySelect('GENDER', 'Female')}
                    style={{ pointerEvents: checkingSlots ? 'none' : 'auto', opacity: checkingSlots ? 0.7 : 1 }}
                  >
                    Female
                  </div>
                </div>
                {checkingSlots && <div style={{ textAlign: 'center', marginTop: '1rem', color: '#718096', fontStyle: 'italic' }}>Checking slot availability...</div>}
              </div>
            )}
            
            {status?.settings?.registrationMode === 'GENDER' && checkingSlots && (
              <div style={{ textAlign: 'center', marginTop: '1rem', color: '#718096', fontStyle: 'italic' }}>Checking slot availability...</div>
            )}

            {status?.settings?.registrationMode === 'TOURNAMENT' && slotAvailable && (
              <div className="animate-fade-in" style={{ animationDuration: '0.6s', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Partner Details</h3>
                
                <div className="form-group">
                  <label>Partner's Name</label>
                  <input 
                    type="text" 
                    name="partnerName" 
                    className="form-control" 
                    placeholder="Enter partner's full name" 
                    value={formData.partnerName} 
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label>Partner's Email</label>
                  <input
                    type="email"
                    name="partnerEmail"
                    className="form-control"
                    placeholder="Enter partner's email address"
                    value={formData.partnerEmail}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label>Partner's Age</label>
                  <input 
                    type="number" 
                    name="partnerAge" 
                    className="form-control" 
                    placeholder="Enter partner's age" 
                    value={formData.partnerAge} 
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label>Partner's Level</label>
                  <select 
                    name="partnerLevel" 
                    className="form-control" 
                    value={formData.partnerLevel} 
                    onChange={handleChange as any}
                    disabled={submitting}
                  >
                    <option value="" disabled>Select partner's playing level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                
                {(formData.tournamentCategory === "Men's Doubles" || formData.tournamentCategory === "Women's Doubles") && (
                  <div className="form-group" style={{ marginTop: '2rem', padding: '1.5rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem' }}>Would you like to register for another event? (Mixed Doubles)</label>
                    <div className="radio-group">
                      <div 
                        className={`radio-card ${formData.playingMixedDoubles === true ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, playingMixedDoubles: true })}
                        style={{ opacity: submitting ? 0.7 : 1, pointerEvents: submitting ? 'none' : 'auto' }}
                      >
                        Yes
                      </div>
                      <div 
                        className={`radio-card ${formData.playingMixedDoubles === false ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, playingMixedDoubles: false })}
                        style={{ opacity: submitting ? 0.7 : 1, pointerEvents: submitting ? 'none' : 'auto' }}
                      >
                        No
                      </div>
                    </div>
                    
                    {formData.playingMixedDoubles && (
                      <div className="animate-fade-in" style={{ marginTop: '1.5rem' }}>
                        <div className="form-group">
                          <label>Mixed Doubles Partner's Name</label>
                          <input 
                            type="text" 
                            name="mixedPartnerName" 
                            className="form-control" 
                            placeholder="Enter mixed partner's full name" 
                            value={formData.mixedPartnerName} 
                            onChange={handleChange}
                            disabled={submitting}
                          />
                        </div>

                        <div className="form-group">
                          <label>Mixed Doubles Partner's Email</label>
                          <input
                            type="email"
                            name="mixedPartnerEmail"
                            className="form-control"
                            placeholder="Enter mixed partner's email"
                            value={formData.mixedPartnerEmail}
                            onChange={handleChange}
                            disabled={submitting}
                          />
                        </div>

                        <div className="form-group">
                          <label>Mixed Doubles Partner's Age</label>
                          <input 
                            type="number" 
                            name="mixedPartnerAge" 
                            className="form-control" 
                            placeholder="Enter mixed partner's age" 
                            value={formData.mixedPartnerAge} 
                            onChange={handleChange}
                            disabled={submitting}
                          />
                        </div>

                        <div className="form-group">
                          <label>Mixed Doubles Partner's Level</label>
                          <select 
                            name="mixedPartnerLevel" 
                            className="form-control" 
                            value={formData.mixedPartnerLevel} 
                            onChange={handleChange as any}
                            disabled={submitting}
                          >
                            <option value="" disabled>Select mixed partner's playing level</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-dark)', fontWeight: 700 }}>Upload images for verification</h4>
                  
                  <div className="form-group">
                    <label>Your Image</label>
                    <div className="file-upload-wrapper">
                      <div className="file-upload-btn">
                        {userPhoto ? userPhoto.name : 'Upload Your Image'}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, setUserPhoto)} 
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Partner's Image</label>
                    <div className="file-upload-wrapper">
                      <div className="file-upload-btn">
                        {partnerPhoto ? partnerPhoto.name : 'Upload Partner Image'}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, setPartnerPhoto)} 
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {formData.playingMixedDoubles && (
                    <div className="form-group animate-fade-in">
                      <label>Mixed Partner's Image</label>
                      <div className="file-upload-wrapper">
                        <div className="file-upload-btn">
                          {mixedPartnerPhoto ? mixedPartnerPhoto.name : 'Upload Mixed Partner Image'}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleFileChange(e, setMixedPartnerPhoto)} 
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                      onChange={(e) => handleFileChange(e, setScreenshot)} 
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
