import { prisma } from '../../../src/common';

export const reportReceiversSeed = async () => {
  try {
    console.log('🌱 Seed report receivers');

    const adminWaReceiver = process.env.ADMIN_WA_RECEIVER;
    const isAdminWaReceiverGroup = process.env.ADMIN_WA_CHANNEL
      ? process.env.ADMIN_WA_CHANNEL.toLowerCase() === 'group'
      : false;
    const adminEmailReceiver = process.env.ADMIN_EMAIL_RECEIVER;

    if (!adminEmailReceiver && !adminWaReceiver) {
      console.log('⛔ No number or email to be initiated');

      return;
    }

    const admin = await prisma.users.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, name: true },
    });

    await prisma.$transaction([
      prisma.emailReceivers.create({
        data: {
          user_id: admin?.id,
          email: adminEmailReceiver!,
          name: admin?.name || 'Admin Unnamed',
        },
      }),
      prisma.waReceivers.create({
        data: {
          user_id: admin?.id,
          wa_chat_id: adminWaReceiver!,
          is_group: isAdminWaReceiverGroup,
          name: admin?.name || 'Admin Unnamed',
        },
      }),
    ]);
  } catch (error) {
    console.log(`❌ Error in report receivers. ${error}`);
  }
};
