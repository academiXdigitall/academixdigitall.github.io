import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface ArchiveItem {
  id: string;
  title: string;
  category: string;
  mediaType: string;
  description: string;
  link: string;
}

export interface SiteSettings {
  siteName: string;
  logoHighlight: string;
  subtitle: string;
  footerText: string;
}

export interface PageItem {
  id: string;
  title: string;
  body: string;
  label: string;
  link: string;
}

export interface PageSection {
  id: string;
  title: string;
  body: string;
  display: 'prose' | 'cards' | 'chips';
  items: PageItem[];
}

export interface PageContent {
  eyebrow: string;
  title: string;
  description: string;
  sections: PageSection[];
}

export type EditablePageId = 'about' | 'ventures' | 'open-source' | 'contact';
export type EditablePages = Record<EditablePageId, PageContent>;

export interface SiteContent {
  projects: ArchiveItem[];
  settings: SiteSettings;
  pages: EditablePages;
}

export const defaultSiteSettings: SiteSettings = {
  siteName: 'AcademiX',
  logoHighlight: 'Digital',
  subtitle: 'Technology ventures',
  footerText: '© 2026 AcademiX Digital. All rights reserved.',
};

export const editablePageIds: EditablePageId[] = ['about', 'ventures', 'open-source', 'contact'];

export const defaultPages: EditablePages = {
  about: {
    eyebrow: 'Institutional Overview',
    title: 'About AcademiX Digital',
    description: 'An independent digital venture and public-interest technology initiative, dedicated to scalable web architectures and digital world.',
    sections: [
      {
        id: 'about-mission',
        title: '',
        body: 'AcademiX Digital was founded to bridge the critical gap between rigorous engineering and open civic infrastructure. Operating at the intersection of software development and public-interest technology, our venture focuses on building resilient web systems, transparent compliance registries, and digital history archives.\n\nOur core mission is rooted in regional digital preservation and civic accountability. Whether it is documenting historical timelines or architecting platforms for municipal data analysis, we aim to build tools that empower communities and public institutions.',
        display: 'prose',
        items: [],
      },
      {
        id: 'about-pillars',
        title: '',
        body: '',
        display: 'cards',
        items: [
          { id: 'civic-technology', title: 'Civic Technology', body: 'Building software solutions for municipal reporting, governance performance tracking, and public compliance monitoring.', label: '', link: '' },
          { id: 'public-archives', title: 'Public Archives', body: 'Documenting regional history and significant public-interest records through structured visual timelines and editorial archives.', label: '', link: '' },
        ],
      },
    ],
  },
  ventures: {
    eyebrow: 'Our ecosystem',
    title: 'Ventures built for public value',
    description: 'Independent products and initiatives exploring civic technology, digital preservation, and practical software for organizations.',
    sections: [
      {
        id: 'venture-list',
        title: '',
        body: '',
        display: 'cards',
        items: [
          { id: 'nepal-disaster-archive', title: 'Nepal Disaster Archive', body: 'A public-interest archive documenting Nepal’s historical disaster events through structured records, timelines, and editorial context.', label: 'Active', link: '' },
          { id: 'civic-governance-trackers', title: 'Civic Governance Trackers', body: 'An initiative exploring transparent tools for public reporting, governance performance, and civic accountability.', label: 'Planning phase', link: '' },
          { id: 'small-business-operating-systems', title: 'Small-Business Operating Systems', body: 'Practical digital systems to help small businesses organize workflows and make day-to-day operations easier to manage.', label: 'In development', link: '' },
        ],
      },
    ],
  },
  'open-source': {
    eyebrow: 'Built in the open',
    title: 'Open Source & Code',
    description: 'We value reusable tools, clear documentation, and community collaboration. Public repositories and contribution guidance will be listed here as they are released.',
    sections: [
      {
        id: 'open-source-projects',
        title: '',
        body: '',
        display: 'cards',
        items: [
          { id: 'public-repositories', title: 'Public repositories', body: 'Browse the AcademiX Digital public profile for repositories and code updates.', label: 'Repository listing coming soon', link: 'https://github.com/academiXdigitall' },
        ],
      },
      {
        id: 'open-source-technologies',
        title: 'Technology',
        body: 'Current project work includes modern web technologies such as:',
        display: 'chips',
        items: [
          { id: 'react', title: 'React', body: '', label: '', link: '' },
          { id: 'typescript', title: 'TypeScript', body: '', label: '', link: '' },
          { id: 'nodejs', title: 'Node.js', body: '', label: '', link: '' },
        ],
      },
      {
        id: 'contributing',
        title: 'Contributing',
        body: 'When repositories open, each project will include setup instructions, contribution guidelines, and issue-reporting details in its README.',
        display: 'prose',
        items: [],
      },
    ],
  },
  contact: {
    eyebrow: 'Start a conversation',
    title: 'Contact & Inquiries',
    description: 'We welcome conversations about institutional partnerships, media inquiries, and developer collaboration.',
    sections: [
      {
        id: 'contact-information',
        title: '',
        body: '',
        display: 'cards',
        items: [
          { id: 'email-social', title: 'Email & social', body: 'For developer updates and public code, find AcademiX Digital on GitHub.', label: 'GitHub: academiXdigitall ↗', link: 'https://github.com/academiXdigitall' },
        ],
      },
    ],
  },
};

function parseProjectList(value: unknown): ArchiveItem[] {
  if (!Array.isArray(value)) {
    throw new Error('The site content contains an invalid project list.');
  }

  return value.map((project: unknown) => {
    if (!project || typeof project !== 'object') {
      throw new Error('The site content contains an invalid project.');
    }

    const item = project as Record<string, unknown>;
    const fields = ['id', 'title', 'category', 'mediaType', 'description', 'link'] as const;
    if (!fields.every(field => typeof item[field] === 'string')) {
      throw new Error('A project is missing one or more required text fields.');
    }

    return {
      id: item.id as string,
      title: item.title as string,
      category: item.category as string,
      mediaType: item.mediaType as string,
      description: item.description as string,
      link: item.link as string,
    };
  });
}

function parseSiteSettings(value: unknown): SiteSettings {
  if (!value || typeof value !== 'object') {
    throw new Error('The site content contains invalid branding settings.');
  }

  const settings = value as Record<string, unknown>;
  return {
    siteName: typeof settings.siteName === 'string' ? settings.siteName : defaultSiteSettings.siteName,
    logoHighlight: typeof settings.logoHighlight === 'string' ? settings.logoHighlight : defaultSiteSettings.logoHighlight,
    subtitle: typeof settings.subtitle === 'string' ? settings.subtitle : defaultSiteSettings.subtitle,
    footerText: typeof settings.footerText === 'string' ? settings.footerText : defaultSiteSettings.footerText,
  };
}

function parsePages(value: unknown): EditablePages {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The site content contains invalid page content.');
  }

  const pages = value as Record<string, unknown>;
  const parsed = { ...defaultPages };
  for (const pageId of editablePageIds) {
    const pageValue = pages[pageId];
    if (pageValue === undefined || pageValue === null) continue;
    if (typeof pageValue !== 'object' || Array.isArray(pageValue)) {
      throw new Error(`The ${pageId} page content is invalid.`);
    }

    const page = pageValue as Record<string, unknown>;
    if (typeof page.eyebrow !== 'string' || typeof page.title !== 'string' || typeof page.description !== 'string' || !Array.isArray(page.sections)) {
      throw new Error(`The ${pageId} page is missing required content fields.`);
    }

    const sections = page.sections.map((sectionValue: unknown) => {
      if (!sectionValue || typeof sectionValue !== 'object' || Array.isArray(sectionValue)) {
        throw new Error(`The ${pageId} page contains an invalid section.`);
      }
      const section = sectionValue as Record<string, unknown>;
      if (typeof section.id !== 'string' || typeof section.title !== 'string' || typeof section.body !== 'string' ||
          !['prose', 'cards', 'chips'].includes(String(section.display)) || !Array.isArray(section.items)) {
        throw new Error(`The ${pageId} page contains a section with invalid fields.`);
      }
      const items = section.items.map((itemValue: unknown) => {
        if (!itemValue || typeof itemValue !== 'object' || Array.isArray(itemValue)) {
          throw new Error(`The ${pageId} page contains an invalid content item.`);
        }
        const item = itemValue as Record<string, unknown>;
        if (['id', 'title', 'body', 'label', 'link'].some(field => typeof item[field] !== 'string')) {
          throw new Error(`The ${pageId} page contains a content item with missing fields.`);
        }
        return {
          id: item.id as string,
          title: item.title as string,
          body: item.body as string,
          label: item.label as string,
          link: item.link as string,
        };
      });
      return {
        id: section.id as string,
        title: section.title as string,
        body: section.body as string,
        display: section.display as PageSection['display'],
        items,
      };
    });

    parsed[pageId] = {
      eyebrow: page.eyebrow,
      title: page.title,
      description: page.description,
      sections,
    };
  }
  return parsed;
}

function parseContent(value: unknown): SiteContent {
  if (!value || typeof value !== 'object') {
    throw new Error('Supabase returned invalid site content.');
  }

  const row = value as Record<string, unknown>;
  return {
    projects: parseProjectList(row.projects),
    settings: parseSiteSettings(row.settings),
    pages: parsePages(row.pages ?? {}),
  };
}

export async function loadSiteContent(): Promise<SiteContent> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the required site environment variables and rebuild.');
  }

  const { data, error } = await supabase
    .from('site_content')
    .select('projects, settings, pages')
    .eq('id', true)
    .single();

  if (error) throw error;
  return parseContent(data);
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the required site environment variables and rebuild.');
  }

  const { data, error } = await supabase
    .from('site_content')
    .update({
      projects: content.projects,
      settings: content.settings,
      pages: content.pages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true)
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error('The shared site content row was not found. Run the Supabase setup SQL.');
}

export function subscribeToSiteContent(
  onChange: (content: SiteContent) => void,
  onError: (message: string) => void,
): RealtimeChannel | null {
  if (!supabase) return null;

  return supabase
    .channel('public-site-content')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'site_content', filter: 'id=eq.true' },
      payload => {
        try {
          onChange(parseContent(payload.new));
        } catch (error) {
          onError(error instanceof Error ? error.message : String(error));
        }
      },
    )
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(`Live updates are unavailable (${status}). Reload the page to fetch the latest content.`);
      }
    });
}

export function loadLegacyBrowserContent(): SiteContent | null {
  const projectsValue = localStorage.getItem('academix_shared_db');
  const settingsValue = localStorage.getItem('academix_settings');
  if (!projectsValue && !settingsValue) return null;

  const projects = projectsValue ? parseProjectList(JSON.parse(projectsValue)) : [];
  const settings = settingsValue ? parseSiteSettings(JSON.parse(settingsValue)) : defaultSiteSettings;
  const hasNonDefaultSettings = Object.keys(defaultSiteSettings).some(
    key => settings[key as keyof SiteSettings] !== defaultSiteSettings[key as keyof SiteSettings],
  );

  return projects.length > 0 || hasNonDefaultSettings ? { projects, settings, pages: defaultPages } : null;
}
