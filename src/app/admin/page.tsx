'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [limits, setLimits] = useState({ maxMale: 29, maxFemale: 29, registrationOpen: true, qrCodeImageUrl: '' });
  
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('adminToken');
    if (savedToken) {
      setPassword(savedToken);
      setAuthenticated(true);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
  }, [authenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resReg, resStat] = await Promise.all([
        fetch('/api/admin/registrations', { headers: { 'Authorization': `Bearer ${password}` } }),
        fetch('/api/status')
      ]);

      if (resReg.status === 401) {
        setAuthenticated(false);
        sessionStorage.removeItem('adminToken');
        alert('Invalid or expired password');
        return;
      }

      const regData = await resReg.json();
      const statData = await resStat.json();

      setRegistrations(regData);
      setStatus(statData);
      setLimits({
        maxMale: statData.settings.maxMale,
        maxFemale: statData.settings.maxFemale,
        registrationOpen: statData.settings.registrationOpen,
        qrCodeImageUrl: statData.settings.qrCodeImageUrl || ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('adminToken', password);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    setAuthenticated(false);
    setPassword('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this registration?')) return;
    
    try {
      await fetch(`/api/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });
      fetchData();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('maxMale', limits.maxMale.toString());
      formData.append('maxFemale', limits.maxFemale.toString());
      formData.append('registrationOpen', limits.registrationOpen.toString());
      if (qrImageFile) {
        formData.append('qrCodeImage', qrImageFile);
      }

      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${password}`
        },
        body: formData
      });
      setQrImageFile(null);
      fetchData();
      alert('Settings updated successfully');
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(registrations.map(r => ({
      'Registration ID': r.registrationId,
      'Full Name': r.name,
      'Phone Number': r.phone,
      'Gender': r.gender,
      'Age': r.age || '',
      'Date & Time': new Date(r.createdAt).toLocaleString(),
      'Screenshot URL': r.paymentScreenshotUrl
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, "Bs_Club_Registrations.xlsx");
  };

  if (!authenticated) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="premium-card" style={{ width: '100%' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="btn" type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="container"><h2 className="title-3d">Loading Admin...</h2></div>;

  return (
    <div style={{ backgroundColor: '#f7fafc', minHeight: '100vh', color: '#1a202c' }}>
      <header className="admin-header">
        <h2>B's Club Admin</h2>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid white', color: 'white', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </header>

      <div className="admin-container animate-fade-in">
        
        <div className="stats-grid">
          <div className="stat-card">
            <div style={{ color: '#718096', fontWeight: 700 }}>Total Registrations</div>
            <div className="stat-value">{status?.counts?.total || 0}</div>
          </div>
          <div className="stat-card">
            <div style={{ color: '#718096', fontWeight: 700 }}>Male (Registered / Limit)</div>
            <div className="stat-value">{status?.counts?.male || 0} / {status?.settings?.maxMale || 0}</div>
          </div>
          <div className="stat-card">
            <div style={{ color: '#718096', fontWeight: 700 }}>Female (Registered / Limit)</div>
            <div className="stat-value">{status?.counts?.female || 0} / {status?.settings?.maxFemale || 0}</div>
          </div>
          <div className="stat-card" style={{ backgroundColor: status?.status?.isOpen ? '#c6f6d5' : '#fed7d7' }}>
            <div style={{ color: '#718096', fontWeight: 700 }}>Status</div>
            <div className="stat-value" style={{ fontSize: '2rem', color: status?.status?.isOpen ? 'var(--success)' : 'var(--error)' }}>
              {status?.status?.isOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 300px', backgroundColor: 'white', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem', alignSelf: 'flex-start' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Settings</h3>
            <form onSubmit={handleUpdateSettings}>
              <div className="form-group">
                <label>Max Male Registrations</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={limits.maxMale}
                  onChange={e => setLimits({...limits, maxMale: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="form-group">
                <label>Max Female Registrations</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={limits.maxFemale}
                  onChange={e => setLimits({...limits, maxFemale: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="checkbox" 
                  id="regOpen"
                  checked={limits.registrationOpen}
                  onChange={e => setLimits({...limits, registrationOpen: e.target.checked})}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="regOpen" style={{ margin: 0 }}>Registration Form Open</label>
              </div>
              <div className="form-group">
                <label>Update QR Code Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="form-control"
                  onChange={(e) => setQrImageFile(e.target.files?.[0] || null)}
                />
                {limits.qrCodeImageUrl ? (
                  <img src={limits.qrCodeImageUrl} alt="Current QR Code" style={{ width: '140px', marginTop: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                ) : (
                  <div style={{ marginTop: '0.75rem', color: '#718096' }}>No QR code uploaded yet.</div>
                )}
              </div>
              <button className="btn" type="submit" style={{ padding: '0.8rem', fontSize: '1rem' }}>Save Settings</button>
            </form>
          </div>

          <div style={{ flex: '3 1 600px' }}>
            <div className="admin-controls">
              <h3 style={{ flex: 1 }}>Registrations Data</h3>
              <button className="btn" onClick={exportToExcel} style={{ width: 'auto', padding: '0.8rem 1.5rem', fontSize: '1rem' }}>Export to Excel</button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Phone</th>
                    <th>Gender</th>
                    <th>Date</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No registrations yet.</td></tr>
                  ) : (
                    registrations.map(reg => (
                      <tr key={reg.id}>
                        <td style={{ fontWeight: 700 }}>{reg.registrationId}</td>
                        <td>{reg.name}</td>
                          <td>{reg.age ?? '-'}</td>
                        <td>{reg.phone}</td>
                        <td><span className={`badge ${reg.gender === 'Male' ? 'badge-male' : 'badge-female'}`}>{reg.gender}</span></td>
                        <td>{new Date(reg.createdAt).toLocaleDateString()} {new Date(reg.createdAt).toLocaleTimeString()}</td>
                        <td>
                          <button 
                            onClick={() => setSelectedScreenshot(reg.paymentScreenshotUrl)}
                            style={{ padding: '0.3rem 0.6rem', background: '#edf2f7', border: '1px solid #cbd5e0', borderRadius: '5px', cursor: 'pointer', fontSize: '0.875rem' }}
                          >
                            View
                          </button>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleDelete(reg.id)}
                            style={{ padding: '0.3rem 0.6rem', background: '#fed7d7', color: '#c53030', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {selectedScreenshot && (
        <div className="modal-overlay" onClick={() => setSelectedScreenshot(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Payment Screenshot</h3>
            <img src={selectedScreenshot} alt="Payment Screenshot" />
            <button className="btn" onClick={() => setSelectedScreenshot(null)} style={{ padding: '0.8rem' }}>Close</button>
          </div>
        </div>
      )}
      
    </div>
  );
}
