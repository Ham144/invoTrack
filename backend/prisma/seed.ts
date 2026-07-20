import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { InvoiceScanStatus, ROLE } from '../src/common/shared-enum';
import { buildLocalClipPath } from '../src/invo-track/agent/clip-storage';

const ORG_NAME =
  process.env.DEFAULT_ORGANIZATION_NAME || 'Catur Sukses Internasional';
const WORKSTATION_ID = '00000000-0000-0000-0000-000000000010';
const CCTV_JASA_ID = '00000000-0000-0000-0000-000000000001';
const CCTV_HAM_ID = '00000000-0000-0000-0000-000000000002';
const SCANNER_JASA_ID = '00000000-0000-0000-0000-000000000011';
const SCANNER_HAM_ID = '00000000-0000-0000-0000-000000000012';

const SEED_USERS = [
  {
    username: process.env.SEED_ADMIN_USERNAME || 'jasa',
    password: process.env.SEED_ADMIN_PASSWORD || 'jasa.js',
    displayName: 'Jasa',
    role: ROLE.ADMIN_ORGANIZATION,
    description: 'Akun admin organisasi (seed)',
  },
  {
    username: process.env.SEED_OPERATOR_USERNAME || 'ham',
    password: process.env.SEED_OPERATOR_PASSWORD || 'ham.js',
    displayName: 'Operator Kasir',
    role: ROLE.OPERATOR,
    description: 'Akun operator scan (seed)',
  },
];

async function init() {
  const prisma = new PrismaClient();

  const organization = await prisma.organization.upsert({
    where: { name: ORG_NAME },
    update: {
      recordingMaxDurationSec: 300,
    },
    create: {
      name: ORG_NAME,
      recordingMaxDurationSec: 300,
      subscription: {
        create: { start: new Date(), plan: 'PRO' },
      },
    },
    include: { subscription: true }
  });

  if (organization.subscription) {
    await prisma.organization.update({
      where: { name: ORG_NAME },
      data: { subscriptionId: organization.subscription.id }
    });
  }

  await prisma.subscription.updateMany({
    where: { organizationId: organization.name },
    data: { plan: 'PRO' },
  });

  await prisma.globalsetting.upsert({
    where: { settingName: 'default' },
    update: {},
    create: { inUse: true, settingName: 'default' },
  });

  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    await prisma.user.upsert({
      where: { username: seedUser.username },
      update: {
        passwordHash,
        displayName: seedUser.displayName,
        role: seedUser.role,
        description: seedUser.description,
        isActive: true,
        organizationName: organization.name,
      },
      create: {
        username: seedUser.username,
        passwordHash,
        displayName: seedUser.displayName,
        role: seedUser.role,
        description: seedUser.description,
        isActive: true,
        organizationName: organization.name,
      },
    });
  }

  await prisma.invoiceScan.deleteMany({
    where: { organizationName: organization.name },
  });
  await prisma.scannerConfig.deleteMany({
    where: { organizationName: organization.name },
  });
  await prisma.workstation.deleteMany({
    where: { organizationName: organization.name },
  });
  await prisma.cctvConfig.deleteMany({
    where: { organizationName: organization.name },
  });

  const cctvHost = process.env.CCTV_HOST || '192.168.168.50';
  const cctvUsername = process.env.CCTV_USERNAME || 'admin';
  const cctvPassword = process.env.CCTV_PASSWORD || 'password';

  await prisma.cctvConfig.createMany({
    data: [
      {
        id: CCTV_JASA_ID,
        organizationName: organization.name,
        label: 'Kasir Muara — Kanal 101',
        rtspUrl: `rtsp://${cctvHost}:554/Streaming/Channels/101`,
        username: cctvUsername,
        password: cctvPassword,
        isActive: true,
        isOnline: true,
        lastSeenAt: new Date(),
      },
      {
        id: CCTV_HAM_ID,
        organizationName: organization.name,
        label: 'Kasir Muara — Kanal 102',
        rtspUrl: `rtsp://${cctvHost}:554/Streaming/Channels/102`,
        username: cctvUsername,
        password: cctvPassword,
        isActive: true,
        isOnline: true,
        lastSeenAt: new Date(),
      },
    ],
  });

  await prisma.workstation.create({
    data: {
      id: WORKSTATION_ID,
      organizationName: organization.name,
      label: 'PC Kasir Utama',
      isActive: true,
      lastSeenAt: new Date(),
    },
  });

  await prisma.scannerConfig.createMany({
    data: [
      {
        id: SCANNER_JASA_ID,
        organizationName: organization.name,
        workstationId: WORKSTATION_ID,
        label: 'Meja Admin — Jasa',
        assignedUsername: SEED_USERS[0].username,
        cctvConfigId: CCTV_JASA_ID,
        baudRate: 9600,
        isActive: true,
      },
      {
        id: SCANNER_HAM_ID,
        organizationName: organization.name,
        workstationId: WORKSTATION_ID,
        label: 'Meja Operator — Ham',
        assignedUsername: SEED_USERS[1].username,
        cctvConfigId: CCTV_HAM_ID,
        baudRate: 9600,
        isActive: true,
      },
    ],
  });

  const mockInvoices = [
    {
      num: 'INV-2026-00041',
      status: InvoiceScanStatus.COMPLETED,
      hoursAgo: 2,
      scannerId: SCANNER_HAM_ID,
    },
    {
      num: 'INV-2026-00042',
      status: InvoiceScanStatus.COMPLETED,
      hoursAgo: 1.5,
      scannerId: SCANNER_HAM_ID,
    },
    {
      num: 'INV-2026-00043',
      status: InvoiceScanStatus.RECORDING,
      hoursAgo: 0.1,
      scannerId: SCANNER_HAM_ID,
    },
    {
      num: 'INV-2026-00040',
      status: InvoiceScanStatus.COMPLETED,
      hoursAgo: 3,
      scannerId: SCANNER_JASA_ID,
    },
    {
      num: 'INV-2026-00039',
      status: InvoiceScanStatus.FAILED,
      hoursAgo: 5,
      scannerId: SCANNER_JASA_ID,
    },
  ];

  for (let i = 0; i < mockInvoices.length; i++) {
    const item = mockInvoices[i];
    const scannedAt = new Date(Date.now() - item.hoursAgo * 3600000);
    const safeName = item.num.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localClipPath =
      item.status === InvoiceScanStatus.COMPLETED
        ? buildLocalClipPath('D:\\BuktiScan\\clips', item.num, scannedAt)
        : null;

    const completedAt =
      item.status === InvoiceScanStatus.COMPLETED
        ? new Date(scannedAt.getTime() + 120000)
        : item.status === InvoiceScanStatus.FAILED
          ? scannedAt
          : null;

    const cctvId =
      item.scannerId === SCANNER_JASA_ID ? CCTV_JASA_ID : CCTV_HAM_ID;
    const operator =
      item.scannerId === SCANNER_JASA_ID
        ? SEED_USERS[0].username
        : SEED_USERS[1].username;

    await prisma.invoiceScan.create({
      data: {
        organizationName: organization.name,
        invoiceNumber: item.num,
        scannedAt,
        completedAt,
        status: item.status,
        recordingSource: 'EDGE',
        workstationId: WORKSTATION_ID,
        localClipPath,
        videoPath:
          item.status === InvoiceScanStatus.COMPLETED
            ? `http://127.0.0.1:19500/clips/${safeName}.mp4`
            : null,
        scannerConfigId: item.scannerId,
        cctvConfigId: cctvId,
        scannedByUsername: operator,
        previousInvoice: i > 0 ? mockInvoices[i - 1].num : null,
      },
    });
  }

  await prisma.$disconnect();
}

init();
