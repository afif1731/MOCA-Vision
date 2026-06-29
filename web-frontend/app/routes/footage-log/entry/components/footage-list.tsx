import {
  CalendarIcon,
  CheckCircleIcon,
  ShieldAlertIcon,
  VideoIcon,
  XCircleIcon,
} from 'lucide-react';
import { Link } from 'react-router';

import { Text } from '@/components/helper/text';
import { Button } from '@/components/ui/button';

import type { IDetectedAnomaly } from '@/schemas/models';

export function FootageList({ footages }: { footages: IDetectedAnomaly[] }) {
  return (
    <div className="flex flex-col gap-4">
      {footages.map((footage) => (
        <FootageItem key={footage.id} footage={footage} />
      ))}
    </div>
  );
}

function FootageItem({ footage }: { footage: IDetectedAnomaly }) {
  return (
    <div className="flex h-fit w-full flex-row items-center justify-between gap-6 rounded-xl bg-white px-4 py-4 drop-shadow-black/50 drop-shadow-xl">
      <div className="flex w-full flex-row items-center gap-6">
        <VideoIcon className="size-10 stroke-2 text-slate-700" />

        <div className="flex w-full flex-col items-start justify-start gap-2">
          <div className="flex w-full flex-row justify-between">
            <Link to={`/footage-log/${footage.id}`}>
              <Text
                type="t"
                className="font-semibold text-red-500 hover:text-red-600 hover:underline"
              >
                {footage.anomaly_type} Detected
              </Text>
            </Link>
          </div>

          <Text type="p" className="text-slate-500">
            #{footage.id}
          </Text>

          <div className="mt-2 flex flex-row items-start justify-start gap-4">
            <div className="flex flex-row items-center justify-start gap-1 rounded-xl bg-slate-200 px-3 py-1 font-medium text-teal-900">
              <ShieldAlertIcon className="size-4" />
              <Text type="btn">Confidence: {(footage.confidence * 100).toFixed(1)}%</Text>
            </div>

            <div className="flex flex-row items-center justify-start gap-1 rounded-xl bg-slate-200 px-3 py-1 font-medium text-teal-900">
              <CalendarIcon className="size-4" />
              <Text type="btn">{new Date(footage.created_at).toLocaleString()}</Text>
            </div>

            <div className="flex flex-row items-center justify-start gap-1 rounded-xl bg-slate-200 px-3 py-1 font-medium text-teal-900">
              {footage.is_valid === true ? (
                <CheckCircleIcon className="size-4 text-green-500" />
              ) : footage.is_valid === false ? (
                <XCircleIcon className="size-4 text-red-500" />
              ) : (
                <XCircleIcon className="size-4 text-slate-500" />
              )}
              <Text type="btn">
                {footage.is_valid === true
                  ? 'Valid'
                  : footage.is_valid === false
                    ? 'Invalid'
                    : 'Unverified'}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <Button asChild variant="outline" className="min-w-fit">
        <Link to={`/footage-log/${footage.id}`}>View Details</Link>
      </Button>
    </div>
  );
}
