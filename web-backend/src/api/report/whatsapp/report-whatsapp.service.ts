import { StatusCodes } from 'http-status-codes';

import { ErrorResponse, type IPaginatedResult, prisma } from '@/common';
import { paginate } from '@/utils';
import { type Prisma, type WaReceivers } from '~/generated/prisma/client';

import {
  type ICreateWhatsappRequest,
  type IEditWhatsappRequest,
  type IWhatsappListQuery,
} from './schema';

export abstract class ReportWhatsappService {
  static async createWhatsappReceiver(data: ICreateWhatsappRequest) {
    const isExist = await prisma.waReceivers.findFirst({
      where: { wa_chat_id: data.wa_chat_id },
    });

    if (isExist) {
      throw new ErrorResponse(
        StatusCodes.CONFLICT,
        'WhatsApp receiver already exists',
      );
    }

    const waReceiver = await prisma.waReceivers.create({
      data: {
        name: data.name,
        wa_chat_id: data.wa_chat_id,
        is_group: data.is_group ?? false,
        is_activated: data.is_activated ?? true,
      },
    });

    return waReceiver;
  }

  static async getWhatsappReceiverList(
    query: IWhatsappListQuery,
  ): Promise<IPaginatedResult<WaReceivers>> {
    const page = query.page || 1;
    const perPage = query.per_page || 10;
    const search = query.search;

    const args: {
      where: Prisma.WaReceiversWhereInput;
      orderBy: Prisma.WaReceiversOrderByWithRelationInput[];
    } = {
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { wa_chat_id: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: [{ created_at: 'desc' }],
    };

    const result = await paginate<WaReceivers, typeof args>(
      prisma.waReceivers,
      page,
      perPage,
      args,
    );

    return result;
  }

  static async getWhatsappReceiverDetail(id: string) {
    const waReceiver = await prisma.waReceivers.findUnique({
      where: { id },
    });

    if (!waReceiver) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'WhatsApp receiver not found',
      );
    }

    return waReceiver;
  }

  static async editWhatsappReceiver(id: string, data: IEditWhatsappRequest) {
    await this.getWhatsappReceiverDetail(id);

    if (data.wa_chat_id) {
      const isExist = await prisma.waReceivers.findFirst({
        where: { wa_chat_id: data.wa_chat_id, NOT: { id } },
      });

      if (isExist) {
        throw new ErrorResponse(
          StatusCodes.CONFLICT,
          'WhatsApp receiver already exists',
        );
      }
    }

    const updated = await prisma.waReceivers.update({
      where: { id },
      data,
    });

    return updated;
  }

  static async deleteWhatsappReceiver(id: string) {
    await this.getWhatsappReceiverDetail(id);

    await prisma.waReceivers.delete({
      where: { id },
    });

    return true;
  }
}
