import { useState } from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { itemStorage } from '@/lib/storage';
import { cn, generateMeta } from '@/lib/utils';

import TitleSection from '@/components/sections/title';
import { Button } from '@/components/ui/button';

import { usePublicLayoutCtx } from '@/routes/layouts/public-layout';

import type { Route } from './+types';
import { DefaultLayoutPanel } from './components/default-layout-panel';
import { PreferenceLayoutPanel } from './components/preference-layout-panel';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Layout Settings', 'Configure your dashboard layout');
}

type LayoutPreference = 'default' | 'user_preference';

export default function PanelLayoutPage() {
  const { user } = usePublicLayoutCtx();
  const isMobile = useIsMobile();

  const [layoutPref, setLayoutPref] = useState<LayoutPreference>(() => {
    const saved = itemStorage.local.get<LayoutPreference>('layout_preference');
    return saved === 'user_preference' && user ? 'user_preference' : 'default';
  });

  const handleToggle = (pref: LayoutPreference) => {
    if (pref === 'user_preference' && !user) return;
    setLayoutPref(pref);
    itemStorage.local.set('layout_preference', pref);
  };

  return (
    <div
      className={cn(
        'block w-full bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
      )}
    >
      <TitleSection title="Layout Settings" />

      <div className="mb-6 flex gap-4">
        <Button
          onClick={() => handleToggle('default')}
          variant={layoutPref === 'default' ? 'default' : 'outline'}
          className={cn(
            'px-4 py-2 font-medium transition-colors',
            layoutPref === 'default'
              ? 'bg-teal-700 text-white hover:bg-teal-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          )}
        >
          Default Layout
        </Button>
        <Button
          onClick={() => handleToggle('user_preference')}
          disabled={!user}
          variant={layoutPref === 'user_preference' ? 'default' : 'outline'}
          className={cn(
            'px-4 py-2 font-medium transition-colors',
            layoutPref === 'user_preference'
              ? 'bg-teal-700 text-white hover:bg-teal-800'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            !user && 'cursor-not-allowed opacity-50 hover:bg-white'
          )}
          title={!user ? 'Please login to use this layout' : ''}
        >
          User Preference Layout
        </Button>
      </div>

      <div className="mt-8">
        {layoutPref === 'default' ? <DefaultLayoutPanel /> : <PreferenceLayoutPanel />}
      </div>
    </div>
  );
}
