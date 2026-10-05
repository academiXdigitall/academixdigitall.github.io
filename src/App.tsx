import { useState, useEffect } from 'react';
import { defaultPages, defaultSiteSettings, loadSiteContent, subscribeToSiteContent, type SiteContent } from './lib/siteContent';
import { supabase } from './lib/supabase';

const toProjectUrl = (link: string) => {
  if (!link || link === '#') return '';
  const trimmed = link.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

export default function App() {
  const [siteContent, setSiteContent] = useState<SiteContent>(() => ({
    projects: [],
    settings: defaultSiteSettings,
    pages: defaultPages,
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoadError('The shared site database is not configured yet.');
      setIsLoading(false);
      return;
    }

    let active = true;
    loadSiteContent()
      .then(content => {
        if (active) setSiteContent(content);
      })
      .catch(error => {
        if (active) setLoadError(`Could not load the shared site content: ${error instanceof Error ? error.message : String(error)}`);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const channel = subscribeToSiteContent(content => {
      if (active) setSiteContent(content);
    }, message => {
      if (active) setLoadError(message);
    });

    return () => {
      active = false;
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, []);

  const { projects: archives, settings } = siteContent;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All media types');

  useEffect(() => {
    document.title = `${settings.siteName} ${settings.logoHighlight} | Portal`;
  }, [settings]);

  const filtered = archives.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All media types' || item.mediaType === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <header className="max-w-5xl mx-auto w-full px-6 py-7 flex flex-wrap items-center justify-between gap-5 border-b border-[#EBE6DC]">
        <a href="/" className="flex items-center gap-3">
          <img src="/academix-logo.png" alt={`${settings.siteName} ${settings.logoHighlight} logo`} className="h-12 w-12 rounded-xl object-contain" />
          <span>
            <strong className="serif-title text-xl">{settings.siteName} <span className="font-normal text-[#685C43]">{settings.logoHighlight}</span></strong>
            <span className="block text-xs uppercase tracking-wide text-[#78716C]">{settings.subtitle}</span>
          </span>
        </a>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-[#78716C]">
          <a href="/" aria-current="page" className="font-semibold text-[#1E2022] underline underline-offset-4">Home</a>
          <a href="/about/" className="hover:text-[#1E2022] transition-colors">About</a>
          <a href="/ventures/" className="hover:text-[#1E2022] transition-colors">Our Ventures</a>
          <a href="/open-source/" className="hover:text-[#1E2022] transition-colors">Open Source</a>
          <a href="/contact/" className="hover:text-[#1E2022] transition-colors">Contact</a>
          <a href="https://github.com/academiXdigitall" target="_blank" rel="noopener noreferrer" className="hover:text-[#1E2022] transition-colors">GitHub ↗</a>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto w-full px-6 py-12 flex-grow">
        {isLoading && <p role="status" className="mb-6 text-sm text-[#78716C]">Loading shared site content…</p>}
        {loadError && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <input 
            type="text"
            placeholder="Search documentaries, events, projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#78716C] shadow-sm"
          />
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-white border border-[#E5E0D8] rounded-xl px-4 py-3 text-sm outline-none cursor-pointer shadow-sm"
          >
            <option>All media types</option>
            <option>Documentaries & Timelines</option>
            <option>Interactive Portals</option>
          </select>
        </div>

        <section className="mb-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C]">Our Work</p>
              <h2 className="serif-title text-3xl sm:text-4xl font-bold text-[#1E2022] mt-2">Selected projects</h2>
            </div>
            <span className="text-xs text-[#78716C]">{filtered.length} published</span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map(item => {
              const projectUrl = toProjectUrl(item.link);

              const cardContent = (
                <>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="serif-title text-2xl font-bold text-[#1E2022]">{item.title}</h3>
                    <span className="shrink-0 text-[10px] px-3 py-1 rounded-full bg-[#F0ECE1] text-[#57534E] uppercase tracking-wide">{item.mediaType}</span>
                  </div>

                  <p className="text-[11px] font-mono text-[#78716C] mb-3 uppercase tracking-[0.15em]">{item.category}</p>
                  <p className="text-[#44403C] text-base leading-relaxed mb-5">{item.description}</p>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm font-medium text-[#1E2022]">
                      {projectUrl ? 'Open project' : 'Project overview'}
                    </span>
                    <span aria-hidden="true" className="text-lg text-[#1E2022]">→</span>
                  </div>
                </>
              );

              if (projectUrl) {
                return (
                  <a
                    key={item.id}
                    href={projectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                  >
                    {cardContent}
                  </a>
                );
              }

              return (
                <div key={item.id} className="rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-sm">
                  {cardContent}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto w-full px-6 py-7 border-t border-[#EBE6DC] flex flex-col gap-5 text-xs text-[#78716C] sm:flex-row sm:items-center sm:justify-between">
        <p>{settings.footerText}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-3">
          <a className="hover:text-[#1E2022]" href="/">Home</a>
          <a className="hover:text-[#1E2022]" href="/about/">About</a>
          <a className="hover:text-[#1E2022]" href="/ventures/">Our Ventures</a>
          <a className="hover:text-[#1E2022]" href="/open-source/">Open Source</a>
          <a className="hover:text-[#1E2022]" href="/contact/">Contact</a>
          <a className="hover:text-[#1E2022]" href="https://github.com/academiXdigitall" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
        </nav>
      </footer>
    </div>
  );
}