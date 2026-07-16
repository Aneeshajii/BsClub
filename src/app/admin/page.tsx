'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [limits, setLimits] = useState({ 
    maxMale: 29, maxFemale: 29, 
    registrationMode: 'GENDER',
    venue1Name: '', venue1MaxMale: 15, venue1MaxFemale: 15,
    venue2Name: '', venue2MaxMale: 15, venue2MaxFemale: 15,
    registrationOpen: true, qrCodeImageUrl: '', announcementTitle: '', announcementMessage: '', announcementEnabled: false 
  });
  
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [qrImageFile, setQrImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedSettings = sessionStorage.getItem('bsclub-admin-settings');
    if (!storedSettings) return;

    try {
      const parsed = JSON.parse(storedSettings);
      setLimits(prev => ({ ...prev, ...parsed }));
    } catch {
      // ignore invalid stored settings
    }
  }, []);

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
        fetch('/api/admin/registrations', { headers: { 'Authorization': `Bearer ${password}` }, cache: 'no-store' }),
        fetch('/api/status', { cache: 'no-store' })
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
      const nextLimits = {
        maxMale: statData.settings.maxMale,
        maxFemale: statData.settings.maxFemale,
        registrationOpen: statData.settings.registrationOpen,
        registrationMode: statData.settings.registrationMode || 'GENDER',
        venue1Name: statData.settings.venue1Name || '',
        venue1MaxMale: statData.settings.venue1MaxMale || 15,
        venue1MaxFemale: statData.settings.venue1MaxFemale || 15,
        venue2Name: statData.settings.venue2Name || '',
        venue2MaxMale: statData.settings.venue2MaxMale || 15,
        venue2MaxFemale: statData.settings.venue2MaxFemale || 15,
        qrCodeImageUrl: statData.settings.qrCodeImageUrl || '',
        announcementTitle: statData.settings.announcementTitle || '',
        announcementMessage: statData.settings.announcementMessage || '',
        announcementEnabled: statData.settings.announcementEnabled || false
      };
      setLimits(nextLimits);
      sessionStorage.setItem('bsclub-admin-settings', JSON.stringify(nextLimits));
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
      formData.append('registrationMode', limits.registrationMode);
      formData.append('venue1Name', limits.venue1Name);
      formData.append('venue1MaxMale', limits.venue1MaxMale.toString());
      formData.append('venue1MaxFemale', limits.venue1MaxFemale.toString());
      formData.append('venue2Name', limits.venue2Name);
      formData.append('venue2MaxMale', limits.venue2MaxMale.toString());
      formData.append('venue2MaxFemale', limits.venue2MaxFemale.toString());
      formData.append('announcementTitle', limits.announcementTitle);
      formData.append('announcementMessage', limits.announcementMessage);
      formData.append('announcementEnabled', limits.announcementEnabled.toString());
      if (qrImageFile) {
        formData.append('qrCodeImage', qrImageFile);
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${password}`
        },
        body: formData
      });
      const savedSettings = await res.json();
      const nextLimits = {
        maxMale: savedSettings.maxMale ?? limits.maxMale,
        maxFemale: savedSettings.maxFemale ?? limits.maxFemale,
        registrationOpen: savedSettings.registrationOpen ?? limits.registrationOpen,
        registrationMode: savedSettings.registrationMode ?? limits.registrationMode,
        venue1Name: savedSettings.venue1Name ?? limits.venue1Name,
        venue1MaxMale: savedSettings.venue1MaxMale ?? limits.venue1MaxMale,
        venue1MaxFemale: savedSettings.venue1MaxFemale ?? limits.venue1MaxFemale,
        venue2Name: savedSettings.venue2Name ?? limits.venue2Name,
        venue2MaxMale: savedSettings.venue2MaxMale ?? limits.venue2MaxMale,
        venue2MaxFemale: savedSettings.venue2MaxFemale ?? limits.venue2MaxFemale,
        qrCodeImageUrl: savedSettings.qrCodeImageUrl ?? limits.qrCodeImageUrl,
        announcementTitle: savedSettings.announcementTitle ?? limits.announcementTitle,
        announcementMessage: savedSettings.announcementMessage ?? limits.announcementMessage,
        announcementEnabled: savedSettings.announcementEnabled ?? limits.announcementEnabled
      };
      setLimits(nextLimits);
      sessionStorage.setItem('bsclub-admin-settings', JSON.stringify(nextLimits));
      setQrImageFile(null);
      fetchData();
      alert('Settings updated successfully');
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.text("B's Club Registrations", 14, 15);
    
    const tableColumn = ["Name", "Phone", "Category", "Age", "Registered Before", "Level"];
    const tableRows: any[] = [];
    
    registrations.forEach(r => {
      const rowData = [
        r.name,
        r.phone,
        r.venue || r.gender || '',
        r.age || '',
        r.registeredBefore || '',
        r.level || ''
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save("Bs_Club_Registrations.pdf");
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
          {limits.registrationMode === 'GENDER' ? (
            <>
              <div className="stat-card">
                <div style={{ color: '#718096', fontWeight: 700 }}>Male (Registered / Limit)</div>
                <div className="stat-value">{status?.counts?.male || 0} / {limits.maxMale || 0}</div>
              </div>
              <div className="stat-card">
                <div style={{ color: '#718096', fontWeight: 700 }}>Female (Registered / Limit)</div>
                <div className="stat-value">{status?.counts?.female || 0} / {limits.maxFemale || 0}</div>
              </div>
            </>
          ) : (
            <>
              <div className="stat-card" style={{ overflow: 'hidden' }}>
                <div style={{ color: '#718096', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{limits.venue1Name || 'Venue 1'} (Male)</div>
                <div className="stat-value">{status?.counts?.venue1Male || 0} / {limits.venue1MaxMale || 0}</div>
              </div>
              <div className="stat-card" style={{ overflow: 'hidden' }}>
                <div style={{ color: '#718096', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{limits.venue1Name || 'Venue 1'} (Female)</div>
                <div className="stat-value">{status?.counts?.venue1Female || 0} / {limits.venue1MaxFemale || 0}</div>
              </div>
              <div className="stat-card" style={{ overflow: 'hidden' }}>
                <div style={{ color: '#718096', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{limits.venue2Name || 'Venue 2'} (Male)</div>
                <div className="stat-value">{status?.counts?.venue2Male || 0} / {limits.venue2MaxMale || 0}</div>
              </div>
              <div className="stat-card" style={{ overflow: 'hidden' }}>
                <div style={{ color: '#718096', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{limits.venue2Name || 'Venue 2'} (Female)</div>
                <div className="stat-value">{status?.counts?.venue2Female || 0} / {limits.venue2MaxFemale || 0}</div>
              </div>
            </>
          )}
          <div className="stat-card" style={{ backgroundColor: status?.status?.isOpen ? '#c6f6d5' : '#fed7d7' }}>
            <div style={{ color: '#718096', fontWeight: 700 }}>Status</div>
            <div className="stat-value" style={{ fontSize: '2rem', color: status?.status?.isOpen ? 'var(--success)' : 'var(--error)' }}>
              {status?.status?.isOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 300px', backgroundColor: 'white', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem', alignSelf: 'flex-start' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Announcement Manager</h3>
            <form onSubmit={handleUpdateSettings}>
              <div className="form-group">
                <label>Announcement Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={limits.announcementTitle}
                  onChange={e => setLimits({...limits, announcementTitle: e.target.value})}
                  placeholder="e.g. 📢 Important Update"
                />
              </div>
              <div className="form-group">
                <label>Announcement Message</label>
                <textarea 
                  className="form-control" 
                  value={limits.announcementMessage}
                  onChange={e => setLimits({...limits, announcementMessage: e.target.value})}
                  rows={4}
                  placeholder="Enter the announcement message here..."
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="checkbox" 
                  id="annEnabled"
                  checked={limits.announcementEnabled}
                  onChange={e => setLimits({...limits, announcementEnabled: e.target.checked})}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="annEnabled" style={{ margin: 0 }}>Enable Announcement</label>
              </div>
              <button className="btn" type="submit" style={{ padding: '0.8rem', fontSize: '1rem' }}>Save Announcement</button>
            </form>
          </div>

          <div style={{ flex: '1 1 300px', backgroundColor: 'white', padding: '2rem', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '2rem', alignSelf: 'flex-start' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Settings</h3>
            <form onSubmit={handleUpdateSettings}>
              <div className="form-group">
                <label>Registration Mode</label>
                <select 
                  className="form-control" 
                  value={limits.registrationMode} 
                  onChange={e => setLimits({...limits, registrationMode: e.target.value})}
                >
                  <option value="GENDER">Gender (Male/Female)</option>
                  <option value="VENUE_AND_GENDER">Venue + Gender</option>
                </select>
              </div>

              {limits.registrationMode === 'GENDER' ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Venue 1 Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={limits.venue1Name}
                      onChange={e => setLimits({...limits, venue1Name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue 1 Max Male</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={limits.venue1MaxMale}
                      onChange={e => setLimits({...limits, venue1MaxMale: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue 1 Max Female</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={limits.venue1MaxFemale}
                      onChange={e => setLimits({...limits, venue1MaxFemale: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue 2 Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={limits.venue2Name}
                      onChange={e => setLimits({...limits, venue2Name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue 2 Max Male</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={limits.venue2MaxMale}
                      onChange={e => setLimits({...limits, venue2MaxMale: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Venue 2 Max Female</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={limits.venue2MaxFemale}
                      onChange={e => setLimits({...limits, venue2MaxFemale: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </>
              )}
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
              <button className="btn" onClick={exportToPDF} style={{ width: 'auto', padding: '0.8rem 1.5rem', fontSize: '1rem' }}>Export to PDF</button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Registered Before</th>
                    <th>Level</th>
                    <th>Phone</th>
                    <th>Category</th>
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
                        <td>{reg.registeredBefore ?? '-'}</td>
                        <td>{reg.level ?? '-'}</td>
                        <td>{reg.phone}</td>
                        <td>
                          {reg.venue ? (
                            <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#2d3748' }}>{reg.venue}</span>
                          ) : (
                            <span className={`badge ${reg.gender === 'Male' ? 'badge-male' : 'badge-female'}`}>{reg.gender}</span>
                          )}
                        </td>
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
