import { StatusCodes } from 'http-status-codes';

import { ErrorResponse, type IPaginatedResult, prisma } from '@/common';
import { paginate } from '@/utils';
import { type EmailReceivers, type Prisma } from '~/generated/prisma/client';

import {
  type ICreateEmailRequest,
  type IEditEmailRequest,
  type IEmailListQuery,
} from './schema';

export abstract class ReportEmailService {
  static async createEmailReceiver(data: ICreateEmailRequest) {
    const isExist = await prisma.emailReceivers.findFirst({
      where: { email: data.email },
    });

    if (isExist) {
      throw new ErrorResponse(
        StatusCodes.CONFLICT,
        'Email receiver already exists',
      );
    }

    const emailReceiver = await prisma.emailReceivers.create({
      data: {
        name: data.name,
        email: data.email,
        is_activated: data.is_activated ?? true,
      },
    });

    return emailReceiver;
  }

  static async getEmailReceiverList(
    query: IEmailListQuery,
  ): Promise<IPaginatedResult<EmailReceivers>> {
    const page = query.page || 1;
    const perPage = query.per_page || 10;
    const search = query.search;

    const args: {
      where: Prisma.EmailReceiversWhereInput;
      orderBy: Prisma.EmailReceiversOrderByWithRelationInput[];
    } = {
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: [{ created_at: 'desc' }],
    };

    const result = await paginate<EmailReceivers, typeof args>(
      prisma.emailReceivers,
      page,
      perPage,
      args,
    );

    return result;
  }

  static async getEmailReceiverDetail(id: string) {
    const emailReceiver = await prisma.emailReceivers.findUnique({
      where: { id },
    });

    if (!emailReceiver) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Email receiver not found',
      );
    }

    return emailReceiver;
  }

  static async editEmailReceiver(id: string, data: IEditEmailRequest) {
    await this.getEmailReceiverDetail(id);

    if (data.email) {
      const isExist = await prisma.emailReceivers.findFirst({
        where: { email: data.email, NOT: { id } },
      });

      if (isExist) {
        throw new ErrorResponse(
          StatusCodes.CONFLICT,
          'Email receiver already exists',
        );
      }
    }

    const updated = await prisma.emailReceivers.update({
      where: { id },
      data,
    });

    return updated;
  }

  static async deleteEmailReceiver(id: string) {
    await this.getEmailReceiverDetail(id);

    await prisma.emailReceivers.delete({
      where: { id },
    });

    return true;
  }
}
