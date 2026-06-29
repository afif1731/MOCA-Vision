// biome-ignore-all lint/suspicious/noExplicitAny: any required for now
import { ArrowLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import useDialogStore from '@/hooks/store/use-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { Video } from '@/components/helper/video';
import TitleSection from '@/components/sections/title';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

import type { IDetectedAnomaly } from '@/schemas/models';

import type { Route } from './+types';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Footage Detail', 'Footage Detail Page');
}

export default function FootageDetailPage() {
  const { anomaly_id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { open } = useDialogStore();
  const confirmDialogId = `delete-footage-${anomaly_id}`;

  const [footage, setFootage] = useState<IDetectedAnomaly | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFootage = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<IDetectedAnomaly>(`/violence-detection/${anomaly_id}`);
        // Support standard axios response or success response wrapper
        const data = (response.data as any).data || response.data;
        setFootage(data);
      } catch (error) {
        handleApiResponseError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFootage();
  }, [anomaly_id]);

  const handleUpdate = async (isValid: boolean) => {
    try {
      await api.patch(`/violence-detection/${anomaly_id}`, { is_valid: isValid });
      toast.success('Footage updated successfully');
      setFootage((prev) => (prev ? { ...prev, is_valid: isValid } : null));
    } catch (error) {
      handleApiResponseError(error);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/violence-detection/${anomaly_id}`);
      toast.success('Footage deleted successfully');
      navigate('/footage-log');
    } catch (error) {
      handleApiResponseError(error);
    }
  };

  if (isLoading)
    return (
      <div className="p-8">
        <Text type="h6">Loading...</Text>
      </div>
    );

  if (!footage)
    return (
      <div className="p-8">
        <Text type="h6" className="text-red-500">
          Footage not found
        </Text>
      </div>
    );

  return (
    <div
      className={cn(
        'block w-full bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
      )}
    >
      <TitleSection title={'Footage Details'} />

      <div className="mb-4 flex w-full">
        <Button asChild variant="outline" leftIcon={<ArrowLeftIcon />}>
          <Link to="/footage-log">Back to Logs</Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-6">
        <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-black drop-shadow-xl">
          <Video controls className="h-auto max-h-[60vh] w-full" path={footage.video_path} />
        </div>

        <div className="flex flex-col gap-6 rounded-xl bg-white p-6 drop-shadow-md">
          <Text type="h6" className="font-bold text-slate-800">
            Metadata
          </Text>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="flex flex-col gap-1">
              <Text type="btn" className="font-semibold text-slate-500">
                Anomaly Type
              </Text>
              <Text type="p" className="font-bold text-red-500">
                {footage.anomaly_type}
              </Text>
            </div>

            <div className="flex flex-col gap-1">
              <Text type="btn" className="font-semibold text-slate-500">
                Confidence
              </Text>
              <Text type="p">{(footage.confidence * 100).toFixed(2)}%</Text>
            </div>

            <div className="flex flex-col gap-1">
              <Text type="btn" className="font-semibold text-slate-500">
                Camera Name
              </Text>
              <Text type="p">{footage.camera?.name || footage.camera_id || 'Unknown Camera'}</Text>
            </div>

            <div className="flex flex-col gap-1">
              <Text type="btn" className="font-semibold text-slate-500">
                Recorded At
              </Text>
              <Text type="p">{new Date(footage.created_at).toLocaleString()}</Text>
            </div>

            <div className="flex flex-col gap-1">
              <Text type="btn" className="font-semibold text-slate-500">
                Status
              </Text>
              <Text
                type="p"
                className={cn(
                  'font-bold',
                  footage.is_valid === true
                    ? 'text-green-500'
                    : footage.is_valid === false
                      ? 'text-red-500'
                      : 'text-slate-500'
                )}
              >
                {footage.is_valid === true
                  ? 'Valid Anomaly'
                  : footage.is_valid === false
                    ? 'Invalid Anomaly'
                    : 'Unverified'}
              </Text>
            </div>
          </div>

          <div className="mt-6 flex flex-row flex-wrap gap-4">
            <Button
              onClick={() => handleUpdate(true)}
              variant={footage.is_valid === true ? 'default' : 'outline'}
              className={
                footage.is_valid === true ? 'bg-green-600 text-white hover:bg-green-700' : ''
              }
            >
              Mark as Valid
            </Button>
            <Button
              onClick={() => handleUpdate(false)}
              variant={footage.is_valid === false ? 'default' : 'outline'}
              className={footage.is_valid === false ? 'bg-red-600 text-white hover:bg-red-700' : ''}
            >
              Mark as Invalid
            </Button>
            <Button
              onClick={() => open(confirmDialogId)}
              variant="outline"
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Footage
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        dialogId={confirmDialogId}
        title="Delete Footage"
        description="Are you sure you want to delete this footage? This action cannot be undone."
        actionText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
