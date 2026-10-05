import { useEffect, useState } from 'react';
import {
  defaultPages,
  defaultSiteSettings,
  loadSiteContent,
  subscribeToSiteContent,
  type EditablePageId,
  type PageContent,
  type SiteContent,
} from './lib/siteContent';
import { supabase } from './lib/supabase';

const pageLabels: Record<EditablePageId, string> = {
  about: 'About',
  ventures: 'Our Ventures',
  'open-source': 'Open Source',
  contact: 'Contact',
};

function renderParagraphs(text: string, className: string) {
  return text.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
    <p key={index} className={className}>{paragraph}</p>
  ));
}

export default function Page({ pageId }: { pageId: EditablePageId }) {
  const [siteContent, setSiteContent] = useState<SiteContent>({
    projects: [],
    settings: defaultSiteSettings,
    pages: defaultPages,
  });
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
        if (active) setLoadError(`Could not load shared page content: ${error instanceof Error ? error.message : String(error)}`);
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

  const { settings, pages } = siteContent;
  const page: PageContent = pages[pageId];

  useEffect(() => {
    document.title = `${page.title || pageLabels[pageId]} | ${settings.siteName} ${settings.logoHighlight}`;
  }, [page.title, pageId, settings.logoHighlight, settings.siteName]);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1E2022] flex flex-col">
      <header className="max-w-5xl mx-auto w-full px-6 py-7 flex flex-wrap items-center justify-between gap-5 border-b border-[#EBE6DC]">
        <a href="/index.html" className="flex items-center gap-3">
          <img src="/academix-logo.png" alt={`${settings.siteName} ${settings.logoHighlight} logo`} className="h-12 w-12 rounded-xl object-contain" />
          <span>
            <strong className="serif-title text-xl">{settings.siteName} <span className="font-normal text-[#685C43]">{settings.logoHighlight}</span></strong>
            <span className="block text-xs uppercase tracking-wide text-[#78716C]">{settings.subtitle}</span>
          </span>
        </a>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-[#78716C]">
          <a href="/index.html" className="hover:text-[#1E2022] transition-colors">Home</a>
          {(['about', 'ventures', 'open-source', 'contact'] as const).map(id => (
            <a
              key={id}
              href={`/${id}/`}
              aria-current={pageId === id ? 'page' : undefined}
              className={pageId === id ? 'font-semibold text-[#1E2022] underline underline-offset-4' : 'hover:text-[#1E2022] transition-colors'}
            >
              {pageLabels[id]}
            </a>
          ))}
          <a href="https://github.com/academiXdigitall" target="_blank" rel="noopener noreferrer" className="hover:text-[#1E2022] transition-colors">GitHub ↗</a>
        </nav>
      </header>

      <main className={`mx-auto w-full px-6 py-16 flex-grow ${pageId === 'about' || pageId === 'contact' ? 'max-w-4xl' : 'max-w-5xl'}`}>
        {isLoading && <p role="status" className="mb-6 text-sm text-[#78716C]">Loading shared page content…</p>}
        {loadError && <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}

        <div className="mb-12">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#78716C] mb-3">{page.eyebrow}</p>
          <h1 className="serif-title text-4xl sm:text-5xl font-bold mb-5 leading-tight">{page.title}</h1>
          <p className="text-lg text-[#57534E] leading-relaxed max-w-3xl">{page.description}</p>
        </div>

        <div className="space-y-6">
          {page.sections.map(section => (
            <section
              key={section.id}
              aria-label={section.title || undefined}
              className={section.display === 'prose' ? 'border-t border-[#EBE6DC] pt-10 text-[#44403C]' : ''}
            >
              {section.title && <h2 className="serif-title text-2xl font-bold mb-4">{section.title}</h2>}
              {section.body && (
                <div className={section.display === 'prose' ? 'space-y-5 text-base leading-relaxed' : 'text-sm leading-relaxed text-[#57534E] mb-5'}>
                  {renderParagraphs(section.body, '')}
                </div>
              )}

              {section.display === 'chips' ? (
                <ul className="flex flex-wrap gap-2" aria-label={section.title || 'Content items'}>
                  {section.items.map(item => <li key={item.id} className="rounded-full bg-[#F0ECE1] px-3 py-1 text-xs text-[#57534E]">{item.title}</li>)}
                </ul>
              ) : section.display === 'cards' && section.items.length > 0 ? (
                <div className={`grid gap-6 ${pageId === 'about' ? 'sm:grid-cols-3' : 'md:grid-cols-2'}`}>
                  {section.items.map(item => (
                    <article key={item.id} className="rounded-2xl border border-[#E5E0D8] bg-white p-7 shadow-sm">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <h2 className="serif-title text-2xl font-bold">{item.title}</h2>
                        {item.label && <span className="shrink-0 rounded-full bg-[#F0ECE1] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#57534E]">{item.label}</span>}
                      </div>
                      {item.body && <p className="text-sm leading-relaxed text-[#57534E] mb-4">{item.body}</p>}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#1E2022] underline underline-offset-4">
                          {item.label || 'Learn more'} <span aria-hidden="true">↗</span>
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </main>

      <footer className="max-w-5xl mx-auto w-full px-6 py-7 border-t border-[#EBE6DC] flex flex-col gap-5 text-xs text-[#78716C] sm:flex-row sm:items-center sm:justify-between">
        <p>{settings.footerText}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-3">
          <a className="hover:text-[#1E2022]" href="/index.html">Home</a>
          {(['about', 'ventures', 'open-source', 'contact'] as const).map(id => <a key={id} className="hover:text-[#1E2022]" href={`/${id}/`}>{pageLabels[id]}</a>)}
          <a className="hover:text-[#1E2022]" href="https://github.com/academiXdigitall" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
        </nav>
      </footer>
    </div>
  );
}
