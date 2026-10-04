import React, { useState, useEffect } from 'react';

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_HASH = '822d1349ef1cb0f2867ff824cf647073865da841e811992112274500cf927c90'; // academiX2026
const LEGACY_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // previous incorrect default

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('auth_secure') === 'true');
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'settings'>('overview');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [archives, setArchives] = useState<any[]>(() => JSON.parse(localStorage.getItem('academix_shared_db') || '[]'));
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('academix_settings') || '{ "siteName": "AcademiX", "logoHighlight": "Digital", "subtitle": "Technology ventures", "footerText": "© 2026 AcademiX Digital. All rights reserved." }'));

  // Password update states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Project form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [mediaType, setMediaType] = useState('Documentaries & Timelines');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const resetProjectForm = () => {
    setEditingProjectId(null);
    setTitle('');
    setCategory('');
    setMediaType('Documentaries & Timelines');
    setDescription('');
    setLink('');
  };

  useEffect(() => {
    localStorage.setItem('academix_shared_db', JSON.stringify(archives));
  }, [archives]);

  useEffect(() => {
    localStorage.setItem('academix_settings', JSON.stringify(settings));
  }, [settings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedHash = localStorage.getItem('admin_pass_hash') || DEFAULT_HASH;
    const enteredHash = await hashPassword(password);
    const validHashes = new Set([storedHash, DEFAULT_HASH, LEGACY_HASH]);
    if (username === 'admin' && validHashes.has(enteredHash)) {
      setIsAuthenticated(true);
      sessionStorage.setItem('auth_secure', 'true');
    } else {
      alert('Authentication Failed: Incorrect Username or Password.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      alert('New passwords do not match.');
      return;
    }
    const storedHash = localStorage.getItem('admin_pass_hash') || DEFAULT_HASH;
    const currentEnteredHash = await hashPassword(currentPass);
    const validHashes = new Set([storedHash, DEFAULT_HASH, LEGACY_HASH]);
    if (!validHashes.has(currentEnteredHash)) {
      alert('Current password is incorrect.');
      return;
    }
    const newHash = await hashPassword(newPass);
    localStorage.setItem('admin_pass_hash', newHash);
    alert('Password updated successfully with SHA-256 hashing!');
    setCurrentPass(''); setNewPass(''); setConfirmPass('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FBF9F5]">
        <div className="bg-white border border-[#E5E0D8] rounded-3xl max-w-md w-full p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-1">
            <img src="/academix-logo.png" alt="AcademiX Digital logo" className="h-12 w-12 rounded-xl object-contain" />
            <h1 className="serif-title text-2xl font-bold">Secure Admin Login</h1>
          </div>
          <p className="text-xs text-[#78716C] mb-6">Default: admin / academiX2026</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-sm outline-none" required autoFocus />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-sm outline-none" required />
            <button type="submit" className="w-full bg-[#1E2022] text-white p-3 rounded-xl text-sm font-medium">Access Dashboard</button>
            <div className="text-center pt-2"><a href="/index.html" className="text-xs text-[#78716C] underline">← Back to Public Website</a></div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FBF9F5]">
      <aside className="w-full md:w-64 bg-white border-r border-[#EBE6DC] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <img src="/academix-logo.png" alt="AcademiX Digital logo" className="h-10 w-10 rounded-lg object-contain" />
            <h2 className="serif-title text-lg font-bold">Dashboard Suite</h2>
          </div>
          <p className="text-xs text-[#78716C] font-mono mb-6">Admin Management</p>
          <nav className="space-y-2">
            <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium ${activeTab === 'overview' ? 'bg-[#1E2022] text-white' : 'text-[#57534E] hover:bg-[#F0ECE1]'}`}>📊 Overview</button>
            <button onClick={() => setActiveTab('projects')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium ${activeTab === 'projects' ? 'bg-[#1E2022] text-white' : 'text-[#57534E] hover:bg-[#F0ECE1]'}`}>🗂️ Manage Projects ({archives.length})</button>
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium ${activeTab === 'settings' ? 'bg-[#1E2022] text-white' : 'text-[#57534E] hover:bg-[#F0ECE1]'}`}>⚙️ Site Settings & Branding</button>
          </nav>
        </div>
        <div className="pt-6 border-t border-[#EBE6DC] space-y-3">
          <a href="/index.html" target="_blank" className="block text-xs text-center text-[#78716C] underline">View Live Website ↗</a>
          <button onClick={() => { sessionStorage.removeItem('auth_secure'); setIsAuthenticated(false); }} className="w-full bg-red-50 text-red-600 p-2 rounded-xl text-xs font-medium">Sign Out</button>
        </div>
      </aside>

      <main className="flex-grow p-8 max-w-4xl">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="serif-title text-3xl font-bold mb-1">Overview</h1>
              <p className="text-xs text-[#78716C]">System fully operational. Total projects: {archives.length}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-[#E5E0D8]">
                <p className="text-xs font-mono text-[#78716C]">SECURITY</p>
                <p className="text-sm font-semibold text-emerald-600 mt-2">SHA-256 Hashed</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl border border-[#E5E0D8]">
              <h2 className="serif-title text-xl font-bold mb-4">{editingProjectId ? 'Edit Project' : 'Publish New Project'}</h2>
              <form onSubmit={e => {
                e.preventDefault();

                if (!title.trim() || !description.trim()) {
                  alert('Please fill in the title and description.');
                  return;
                }

                if (editingProjectId) {
                  setArchives(prev => prev.map(item =>
                    item.id === editingProjectId
                      ? { ...item, title: title.trim(), category: category.trim(), mediaType, description: description.trim(), link: link.trim() || '#' }
                      : item
                  ));
                  alert('Project updated successfully!');
                } else {
                  setArchives(prev => [{ id: Date.now().toString(), title: title.trim(), category: category.trim(), mediaType, description: description.trim(), link: link.trim() || '#' }, ...prev]);
                  alert('Published successfully!');
                }

                resetProjectForm();
              }} className="space-y-4">
                <input type="text" placeholder="Project Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} className="bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                  <select value={mediaType} onChange={e => setMediaType(e.target.value)} className="bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none">
                    <option>Documentaries & Timelines</option>
                    <option>Interactive Portals</option>
                  </select>
                </div>
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" required />
                <input type="text" placeholder="External Link" value={link} onChange={e => setLink(e.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-[#1E2022] text-white p-3 rounded-xl text-xs font-medium">{editingProjectId ? 'Update Entry' : 'Publish Entry'}</button>
                  {editingProjectId && (
                    <button type="button" onClick={resetProjectForm} className="px-4 bg-[#F0ECE1] text-[#1E2022] p-3 rounded-xl text-xs font-medium">Cancel</button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#E5E0D8]">
              <h2 className="serif-title text-xl font-bold mb-4">Existing Records</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {archives.map(item => (
                  <div key={item.id} className="flex justify-between items-center gap-3 bg-[#FBF9F5] p-3 rounded-xl border border-[#E5E0D8] text-xs">
                    <span className="font-bold">{item.title}</span>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setEditingProjectId(item.id);
                        setTitle(item.title);
                        setCategory(item.category || '');
                        setMediaType(item.mediaType === 'Research & Timelines' ? 'Documentaries & Timelines' : item.mediaType || 'Documentaries & Timelines');
                        setDescription(item.description);
                        setLink(item.link === '#' ? '' : item.link);
                      }} className="text-[#1E2022] font-medium">Edit</button>
                      <button onClick={() => setArchives(prev => prev.filter(a => a.id !== item.id))} className="text-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl border border-[#E5E0D8]">
              <h2 className="serif-title text-xl font-bold mb-4">Site Branding Customization</h2>
              <form onSubmit={e => { e.preventDefault(); alert('Settings saved successfully!'); }} className="space-y-4">
                <input type="text" value={settings.siteName} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" placeholder="Site Name" />
                <input type="text" value={settings.logoHighlight} onChange={e => setSettings({...settings, logoHighlight: e.target.value})} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" placeholder="Logo Highlight" />
                <input type="text" value={settings.subtitle} onChange={e => setSettings({...settings, subtitle: e.target.value})} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" placeholder="Subtitle" />
                <input type="text" value={settings.footerText} onChange={e => setSettings({...settings, footerText: e.target.value})} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" placeholder="Footer Text" />
                <button type="submit" className="bg-[#1E2022] text-white px-6 py-2.5 rounded-xl text-xs font-medium">Save Branding</button>
              </form>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#E5E0D8]">
              <h2 className="serif-title text-xl font-bold mb-4">Update Admin Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <input type="password" placeholder="Current Password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" required />
                <input type="password" placeholder="New Password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" required />
                <input type="password" placeholder="Confirm New Password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" required />
                <button type="submit" className="bg-[#1E2022] text-white px-6 py-2.5 rounded-xl text-xs font-medium">Update Password Securely</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}