import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import TitleSection from '@/components/sections/title';
import { Button } from '@/components/ui/button';

import type { ICameraItem } from '@/schemas/models';

import type { Route } from './+types';
import { CameraListComponent } from './components/camera-list';

export function meta({}: Route.MetaArgs) {
  return generateMeta('CCTV Settings', 'CCTV Camera Settings');
}

export default function CctvSettingsPage() {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [cameras, setCameras] = useState<ICameraItem[]>([]);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        const response = await api.get<ICameraItem[]>('/camera');
        setCameras(response.data);
      } catch (error) {
        handleApiResponseError(error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCameras();
  }, []);

  return (
    <div
      className={cn(
        'block w-full bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
      )}
    >
      <TitleSection title="CCTV Settings" />

      <div className="flex w-full flex-row items-center justify-end pb-4">
        <Button asChild variant="default" size="lg" leftIcon={<PlusIcon />}>
          <Link to="/cctv-settings/create">Create CCTV</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-slate-500">
            Loading CCTV cameras...
          </Text>
        </div>
      ) : isError ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-red-500">
            Failed to load CCTV cameras.
          </Text>
        </div>
      ) : (
        <CameraListComponent cameras={cameras} />
      )}
    </div>
  );
}
