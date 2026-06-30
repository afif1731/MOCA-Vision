import { StatusCodes } from 'http-status-codes';

import { ErrorResponse, prisma } from '@/common';
import { AdditionalValidation, FileManager, SampleVideoSource } from '@/utils';

import {
  type ISystemSettingsUpdateRequest,
  type IVideoSampleDeleteRequest,
  type IVideoSampleUploadRequest,
} from './schema';

export abstract class SystemService {
  static async getAllVideoSample() {
    return await SampleVideoSource.getAllSample();
  }

  static async uploadVideoSample(data: IVideoSampleUploadRequest) {
    AdditionalValidation.isVideoValid(data.video_file);

    const newVideoPath = await FileManager.upload(
      'sample-video',
      data.video_file,
      true,
    );

    if (!newVideoPath)
      throw new ErrorResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to upload sample video to the server',
      );

    return { video_path: newVideoPath };
  }

  static async deleteVideoSample(data: IVideoSampleDeleteRequest) {
    const sampleVideoPath = `sample-video/${data.video_name}`;

    const isVideoDeleted = await FileManager.remove(sampleVideoPath);

    if (isVideoDeleted === false)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Video not found');

    return;
  }

  static async getSystemSettings() {
    let settings = await prisma.systemSettings.findFirst({
      select: {
        video_retention_days: true,
        report_auto_send_wa: true,
        report_auto_send_email: true,
      },
    });

    if (!settings)
      settings = await prisma.systemSettings.create({
        data: {
          video_retention_days: 7,
          report_auto_send_email: false,
          report_auto_send_wa: false,
        },
        select: {
          video_retention_days: true,
          report_auto_send_email: true,
          report_auto_send_wa: true,
        },
      });

    return settings;
  }

  static async updateSystemSettings(data: ISystemSettingsUpdateRequest) {
    const systemSettings = await prisma.systemSettings.findFirst();

    await prisma.systemSettings.update({
      where: { id: systemSettings!.id },
      data: {
        video_retention_days: data.video_retention_days,
        report_auto_send_email: data.report_auto_send_email,
        report_auto_send_wa: data.report_auto_send_wa,
      },
    });
  }
}
