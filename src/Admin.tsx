import React, { useEffect, useState } from 'react';
import { defaultPages, defaultSiteSettings, editablePageIds, loadLegacyBrowserContent, loadSiteContent, saveSiteContent, subscribeToSiteContent, type ArchiveItem, type EditablePageId, type EditablePages, type PageItem, type PageSection, type SiteContent, type SiteSettings } from './lib/siteContent';
import { supabase, supabaseConfigurationError } from './lib/supabase';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const pageNames: Record<EditablePageId, string> = {
  about: 'About',
  ventures: 'Our Ventures',
  'open-source': 'Open Source',
  contact: 'Contact',
};

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'pages' | 'settings'>('overview');
  const [selectedPage, setSelectedPage] = useState<EditablePageId>('about');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [pages, setPages] = useState<EditablePages>(defaultPages);
  const [legacyContent, setLegacyContent] = useState<SiteContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

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
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsAuthenticated(Boolean(session));
    });

    void supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        if (active) setIsAuthenticated(Boolean(data.session));
      })
      .catch(sessionError => {
        if (active) setError(`Could not check the admin session: ${errorMessage(sessionError)}`);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!isAuthenticated || !client) return;

    let active = true;
    setContentLoading(true);
    void (async () => {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Your admin session has expired. Please sign in again.');

      const { data: access, error: accessError } = await client
        .from('site_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (accessError) throw accessError;
      if (!access) throw new Error('This Supabase account is not authorized to manage the website.');

      return loadSiteContent();
    })()
      .then(content => {
        if (!active) return;
        setArchives(content.projects);
        setSettings(content.settings);
        setPages(content.pages);
        try {
          setLegacyContent(loadLegacyBrowserContent());
        } catch (legacyError) {
          setError(`Could not read this browser’s saved content: ${errorMessage(legacyError)}`);
        }
      })
      .catch(async loadError => {
        if (!active) return;
        setError(`Could not load shared site content: ${errorMessage(loadError)}`);
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) setError(`Could not load shared site content: ${errorMessage(loadError)} Sign-out failed: ${signOutError.message}`);
      })
      .finally(() => {
        if (active) setContentLoading(false);
      });

    const channel = subscribeToSiteContent(content => {
      if (!active) return;
      setArchives(content.projects);
      setSettings(content.settings);
      setPages(content.pages);
    }, message => {
      if (active) setError(message);
    });

    return () => {
      active = false;
      if (channel) void client.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const persistContent = async (
    nextArchives: ArchiveItem[] = archives,
    nextSettings: SiteSettings = settings,
    nextPages: EditablePages = pages,
    successMessage = 'Saved. The shared website is updated.',
  ): Promise<boolean> => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await saveSiteContent({ projects: nextArchives, settings: nextSettings, pages: nextPages });
      setArchives(nextArchives);
      setSettings(nextSettings);
      setPages(nextPages);
      setNotice(successMessage);
      return true;
    } catch (saveError) {
      setError(`Could not save shared site content: ${errorMessage(saveError)}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setBusy(true);
    setError('');
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) setError(`Sign-in failed: ${loginError.message}`);
    } catch (loginError) {
      setError(`Sign-in failed: ${errorMessage(loginError)}`);
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    if (newPass !== confirmPass) {
      setError('New passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPass });
      if (passwordError) {
        setError(`Could not update the account password: ${passwordError.message}`);
      } else {
        setNotice('Admin password updated.');
        setNewPass('');
        setConfirmPass('');
      }
    } catch (passwordError) {
      setError(`Could not update the account password: ${errorMessage(passwordError)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setError(`Sign-out failed: ${signOutError.message}`);
    } catch (signOutError) {
      setError(`Sign-out failed: ${errorMessage(signOutError)}`);
    }
  };

  const handleLegacyImport = async () => {
    if (!legacyContent || !window.confirm('Import this browser’s saved projects and branding, replacing the current shared website content?')) return;
    if (await persistContent(legacyContent.projects, legacyContent.settings, pages, 'This browser’s saved content is now shared with all visitors.')) {
      setLegacyContent(null);
    }
  };

  const updateSelectedPage = (update: (page: EditablePages[EditablePageId]) => EditablePages[EditablePageId]) => {
    setPages(current => ({ ...current, [selectedPage]: update(current[selectedPage]) }));
  };

  const updatePageSection = (sectionId: string, update: (section: PageSection) => PageSection) => {
    updateSelectedPage(page => ({
      ...page,
      sections: page.sections.map(section => section.id === sectionId ? update(section) : section),
    }));
  };

  const updatePageItem = (sectionId: string, itemId: string, update: (item: PageItem) => PageItem) => {
    updatePageSection(sectionId, section => ({
      ...section,
      items: section.items.map(item => item.id === itemId ? update(item) : item),
    }));
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5] text-sm text-[#78716C]">Checking admin session…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FBF9F5]">
        <div className="bg-white border border-[#E5E0D8] rounded-3xl max-w-md w-full p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-1">
            <img src="/academix-logo.png" alt="AcademiX Digital logo" className="h-12 w-12 rounded-xl object-contain" />
            <h1 className="serif-title text-2xl font-bold">Secure Admin Login</h1>
          </div>
          <p className="text-xs text-[#78716C] mb-6">Sign in with the admin account created in Supabase.</p>
          {!supabase && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{supabaseConfigurationError}</p>}
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Admin email" value={email} onChange={event => setEmail(event.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-sm outline-none" required autoComplete="username" />
            <input type="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-sm outline-none" required autoComplete="current-password" />
            <button type="submit" disabled={!supabase || busy} className="w-full bg-[#1E2022] text-white p-3 rounded-xl text-sm font-medium disabled:opacity-50">{busy ? 'Signing in…' : 'Access Dashboard'}</button>
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
            <button onClick={() => setActiveTab('pages')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium ${activeTab === 'pages' ? 'bg-[#1E2022] text-white' : 'text-[#57534E] hover:bg-[#F0ECE1]'}`}>📄 Manage Pages (4)</button>
            <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium ${activeTab === 'settings' ? 'bg-[#1E2022] text-white' : 'text-[#57534E] hover:bg-[#F0ECE1]'}`}>⚙️ Site Settings & Branding</button>
          </nav>
        </div>
        <div className="pt-6 border-t border-[#EBE6DC] space-y-3">
          <a href="/index.html" target="_blank" rel="noreferrer" className="block text-xs text-center text-[#78716C] underline">View Live Website ↗</a>
          <button onClick={() => { void handleSignOut(); }} className="w-full bg-red-50 text-red-600 p-2 rounded-xl text-xs font-medium">Sign Out</button>
        </div>
      </aside>

      <main className="flex-grow p-8 max-w-4xl">
        {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
        {contentLoading && <p role="status" className="mb-5 text-sm text-[#78716C]">Loading shared site content…</p>}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h1 className="serif-title text-3xl font-bold mb-1">Overview</h1>
              <p className="text-xs text-[#78716C]">Shared site content is stored in Supabase. Total projects: {archives.length}. Editable pages: 4.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-[#E5E0D8]">
                <p className="text-xs font-mono text-[#78716C]">ADMIN AUTHENTICATION</p>
                <p className="text-sm font-semibold text-emerald-600 mt-2">Supabase Auth</p>
              </div>
            </div>
            {legacyContent && (
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                <h2 className="font-semibold text-sm mb-2">Local-only content found</h2>
                <p className="text-xs text-[#57534E] mb-4">Import this browser’s saved projects and branding into the shared database. This replaces the current shared content.</p>
                <button disabled={busy} onClick={() => { void handleLegacyImport(); }} className="bg-[#1E2022] text-white px-5 py-2.5 rounded-xl text-xs font-medium disabled:opacity-50">Import browser content</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl border border-[#E5E0D8]">
              <h2 className="serif-title text-xl font-bold mb-4">{editingProjectId ? 'Edit Project' : 'Publish New Project'}</h2>
              <form onSubmit={async event => {
                event.preventDefault();
                if (!title.trim() || !description.trim()) {
                  setError('Please fill in the title and description.');
                  return;
                }

                const project: ArchiveItem = {
                  id: editingProjectId || crypto.randomUUID(),
                  title: title.trim(),
                  category: category.trim(),
                  mediaType,
                  description: description.trim(),
                  link: link.trim() || '#',
                };
                const nextArchives = editingProjectId
                  ? archives.map(item => item.id === editingProjectId ? project : item)
                  : [project, ...archives];

                if (await persistContent(nextArchives, settings, pages, editingProjectId ? 'Project updated.' : 'Project published.')) {
                  resetProjectForm();
                }
              }} className="space-y-4">
                <input type="text" placeholder="Project Title" value={title} onChange={event => setTitle(event.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Category" value={category} onChange={event => setCategory(event.target.value)} className="bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                  <select value={mediaType} onChange={event => setMediaType(event.target.value)} className="bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none">
                    <option>Documentaries & Timelines</option>
                    <option>Interactive Portals</option>
                  </select>
                </div>
                <textarea placeholder="Description" value={description} onChange={event => setDescription(event.target.value)} rows={3} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" required />
                <input type="text" placeholder="External Link" value={link} onChange={event => setLink(event.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                <div className="flex gap-3">
                  <button type="submit" disabled={busy || contentLoading} className="flex-1 bg-[#1E2022] text-white p-3 rounded-xl text-xs font-medium disabled:opacity-50">{editingProjectId ? 'Update Entry' : 'Publish Entry'}</button>
                  {editingProjectId && <button type="button" onClick={resetProjectForm} className="px-4 bg-[#F0ECE1] text-[#1E2022] p-3 rounded-xl text-xs font-medium">Cancel</button>}
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
                        setCategory(item.category);
                        setMediaType(item.mediaType === 'Research & Timelines' ? 'Documentaries & Timelines' : item.mediaType || 'Documentaries & Timelines');
                        setDescription(item.description);
                        setLink(item.link === '#' ? '' : item.link);
                      }} className="text-[#1E2022] font-medium">Edit</button>
                      <button disabled={busy} onClick={() => { void persistContent(archives.filter(project => project.id !== item.id), settings, pages, 'Project deleted.'); }} className="text-red-600 disabled:opacity-50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pages' && (
          <div className="space-y-6">
            <div>
              <h1 className="serif-title text-3xl font-bold mb-1">Page Content Management</h1>
              <p className="text-xs text-[#78716C]">Edit the existing content or add sections and content cards. Changes appear on the selected live page after saving.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editablePageIds.map(pageId => (
                <button
                  key={pageId}
                  type="button"
                  onClick={() => setSelectedPage(pageId)}
                  className={`rounded-xl px-4 py-2.5 text-xs font-medium ${selectedPage === pageId ? 'bg-[#1E2022] text-white' : 'border border-[#E5E0D8] bg-white text-[#57534E]'}`}
                >
                  {pageNames[pageId]}
                </button>
              ))}
            </div>

            <form onSubmit={async event => {
              event.preventDefault();
              await persistContent(archives, settings, pages, `${pageNames[selectedPage]} page saved.`);
            }} className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E0D8] space-y-4">
                <h2 className="serif-title text-xl font-bold">Page introduction</h2>
                <label className="block text-xs font-medium text-[#57534E]">
                  Small heading
                  <input value={pages[selectedPage].eyebrow} onChange={event => updateSelectedPage(page => ({ ...page, eyebrow: event.target.value }))} className="mt-2 w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                </label>
                <label className="block text-xs font-medium text-[#57534E]">
                  Page title
                  <input value={pages[selectedPage].title} onChange={event => updateSelectedPage(page => ({ ...page, title: event.target.value }))} className="mt-2 w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                </label>
                <label className="block text-xs font-medium text-[#57534E]">
                  Introduction
                  <textarea value={pages[selectedPage].description} onChange={event => updateSelectedPage(page => ({ ...page, description: event.target.value }))} rows={3} className="mt-2 w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                </label>
              </div>

              {pages[selectedPage].sections.map((section, sectionIndex) => (
                <section key={section.id} className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E0D8] space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="serif-title text-xl font-bold">Content section {sectionIndex + 1}</h2>
                    <button type="button" onClick={() => updateSelectedPage(page => ({ ...page, sections: page.sections.filter(item => item.id !== section.id) }))} className="text-xs font-medium text-red-600">Remove section</button>
                  </div>
                  <label className="block text-xs font-medium text-[#57534E]">
                    Section heading
                    <input value={section.title} onChange={event => updatePageSection(section.id, current => ({ ...current, title: event.target.value }))} className="mt-2 w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                  </label>
                  <label className="block text-xs font-medium text-[#57534E]">
                    Layout
                    <select value={section.display} onChange={event => updatePageSection(section.id, current => ({ ...current, display: event.target.value as PageSection['display'] }))} className="mt-2 w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none">
                      <option value="prose">Text</option>
                      <option value="cards">Content cards</option>
                      <option value="chips">Tags / technology list</option>
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-[#57534E]">
                    Section text
                    <textarea value={section.body} onChange={event => updatePageSection(section.id, current => ({ ...current, body: event.target.value }))} rows={4} placeholder="Separate paragraphs with a blank line." className="mt-2 w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                  </label>

                  <div className="space-y-4">
                    {section.items.map((item, itemIndex) => (
                      <div key={item.id} className="rounded-xl border border-[#E5E0D8] bg-[#FBF9F5] p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-[#57534E]">Content item {itemIndex + 1}</p>
                          <button type="button" onClick={() => updatePageSection(section.id, current => ({ ...current, items: current.items.filter(entry => entry.id !== item.id) }))} className="text-xs text-red-600">Remove</button>
                        </div>
                        <input aria-label="Item title" value={item.title} onChange={event => updatePageItem(section.id, item.id, current => ({ ...current, title: event.target.value }))} placeholder="Title" className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                        <textarea aria-label="Item description" value={item.body} onChange={event => updatePageItem(section.id, item.id, current => ({ ...current, body: event.target.value }))} placeholder="Description" rows={3} className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input aria-label="Item label or status" value={item.label} onChange={event => updatePageItem(section.id, item.id, current => ({ ...current, label: event.target.value }))} placeholder="Label or status (optional)" className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                          <input aria-label="Item link" value={item.link} onChange={event => updatePageItem(section.id, item.id, current => ({ ...current, link: event.target.value }))} placeholder="Link URL (optional)" className="w-full bg-white border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePageSection(section.id, current => ({
                      ...current,
                      display: current.display === 'chips' ? 'chips' : 'cards',
                      items: [...current.items, { id: crypto.randomUUID(), title: '', body: '', label: '', link: '' }],
                    }))}
                    className="rounded-xl border border-[#E5E0D8] px-4 py-2.5 text-xs font-medium text-[#1E2022]"
                  >
                    + Add content item
                  </button>
                </section>
              ))}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => updateSelectedPage(page => ({
                    ...page,
                    sections: [...page.sections, { id: crypto.randomUUID(), title: 'New section', body: '', display: 'cards', items: [] }],
                  }))}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-5 py-3 text-xs font-medium text-[#1E2022]"
                >
                  + Add content section
                </button>
                <button type="submit" disabled={busy || contentLoading} className="rounded-xl bg-[#1E2022] px-6 py-3 text-xs font-medium text-white disabled:opacity-50">
                  Save {pageNames[selectedPage]} Page
                </button>
                <a href={`/${selectedPage}.html`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#F0ECE1] px-5 py-3 text-xs font-medium text-[#1E2022]">Preview live page ↗</a>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-2xl border border-[#E5E0D8]">
              <h2 className="serif-title text-xl font-bold mb-4">Site Branding Customization</h2>
              <form onSubmit={async event => {
                event.preventDefault();
                await persistContent(archives, settings, pages, 'Branding settings saved.');
              }} className="space-y-4">
                <input type="text" value={settings.siteName} onChange={event => setSettings({ ...settings, siteName: event.target.value })} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" placeholder="Site Name" />
                <input type="text" value={settings.logoHighlight} onChange={event => setSettings({ ...settings, logoHighlight: event.target.value })} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" placeholder="Logo Highlight" />
                <input type="text" value={settings.subtitle} onChange={event => setSettings({ ...settings, subtitle: event.target.value })} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" placeholder="Subtitle" />
                <input type="text" value={settings.footerText} onChange={event => setSettings({ ...settings, footerText: event.target.value })} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" placeholder="Footer Text" />
                <button type="submit" disabled={busy || contentLoading} className="bg-[#1E2022] text-white px-6 py-2.5 rounded-xl text-xs font-medium disabled:opacity-50">Save Branding</button>
              </form>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#E5E0D8]">
              <h2 className="serif-title text-xl font-bold mb-4">Update Admin Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <input type="password" placeholder="New Password" value={newPass} onChange={event => setNewPass(event.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" autoComplete="new-password" required />
                <input type="password" placeholder="Confirm New Password" value={confirmPass} onChange={event => setConfirmPass(event.target.value)} className="w-full bg-[#FBF9F5] border border-[#E5E0D8] rounded-xl p-3 text-xs outline-none" autoComplete="new-password" required />
                <button type="submit" disabled={busy} className="bg-[#1E2022] text-white px-6 py-2.5 rounded-xl text-xs font-medium disabled:opacity-50">Update Account Password</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
