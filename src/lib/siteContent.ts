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

export interface SiteContent {
  projects: ArchiveItem[];
  settings: SiteSettings;
}

export const defaultSiteSettings: SiteSettings = {
  siteName: 'AcademiX',
  logoHighlight: 'Digital',
  subtitle: 'Technology ventures',
  footerText: '© 2026 AcademiX Digital. All rights reserved.',
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

function parseContent(value: unknown): SiteContent {
  if (!value || typeof value !== 'object') {
    throw new Error('Supabase returned invalid site content.');
  }

  const row = value as Record<string, unknown>;
  return {
    projects: parseProjectList(row.projects),
    settings: parseSiteSettings(row.settings),
  };
}

export async function loadSiteContent(): Promise<SiteContent> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the required site environment variables and rebuild.');
  }

  const { data, error } = await supabase
    .from('site_content')
    .select('projects, settings')
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

  return projects.length > 0 || hasNonDefaultSettings ? { projects, settings } : null;
}
