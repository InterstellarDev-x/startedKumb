import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient, Role } from './generated/prisma/client'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
  adapter,
})

export const TIMELINE_SEED = [
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    title: 'REGISTRATION',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: null,
    description: 'Registration for all participants, guests and startups.',
    sortOrder: 1,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    title: 'INAUGURATION CEREMONY',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: null,
    description: 'Official inauguration ceremony.',
    sortOrder: 2,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '11:00 AM',
    endTime: '01:00 PM',
    title: 'IDEA-THON',
    venue: 'Visvesvaraya Auditorium, NIT Agartala',
    speaker: null,
    description: 'Idea-thon event block.',
    sortOrder: 3,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '11:00 AM',
    endTime: '12:30 PM',
    title: 'BUILD SMART, STAY LEGAL',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: 'Ms. Shradhanjali Sarma',
    description:
      'Corporate Lawyer, Founding Partner, Sakura Law Chambers.',
    sortOrder: 4,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '12:30 PM',
    endTime: '02:00 PM',
    title: 'PRODUCT DESIGN THAT WINS',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: 'Mr. Pradip Bhaumik & Mr. Arindam Pal',
    description: 'Design Experts, CADFEM.',
    sortOrder: 5,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '02:00 PM',
    endTime: '03:00 PM',
    title: 'BREAK FOR LUNCH',
    venue: 'Campus Dining',
    speaker: null,
    description: 'Lunch break.',
    sortOrder: 6,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '03:00 PM',
    endTime: '04:30 PM',
    title: 'BRAND BOOM: BRANDING FOR STARTUPS',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: 'Mr. Manti Pathak',
    description: 'Branding & Marketing Expert.',
    sortOrder: 7,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '04:30 PM',
    endTime: '05:30 PM',
    title: 'SELL LIKE A PRO',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: 'Mr. Shyamm Bhatia',
    description: 'Sales Expert, Vice President Growth, GWC Asphalt.',
    sortOrder: 8,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '05:30 PM',
    endTime: '06:30 PM',
    title: 'FROM LAB TO STARTUP LAUNCH',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: 'Dr. Harjeet Nath',
    description:
      'Co-Founder Instawater & Trichar; Assistant Professor, Tripura University.',
    sortOrder: 9,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '06:30 PM',
    endTime: '07:30 PM',
    title: "INVESTOR-READINESS AND INVESTOR'S VIEWPOINT",
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: 'Mr. Sidharth Bhuyan',
    description: 'Program Manager, Social Alpha I Sustain Plus (NE Team).',
    sortOrder: 10,
  },
  {
    dayLabel: 'Day 1: 14th March, 2026 (Saturday)',
    eventDate: '2026-03-14',
    startTime: '07:30 PM',
    endTime: '08:30 PM',
    title: 'NETWORKING SESSION & DJ SESSION',
    venue: 'Knowledge Park, NIT Agartala',
    speaker: null,
    description: 'Networking and DJ session.',
    sortOrder: 11,
  },
  {
    dayLabel: 'Day 2: 15th March, 2026 (Sunday)',
    eventDate: '2026-03-15',
    startTime: '10:00 AM',
    endTime: '03:00 PM',
    title:
      'Live Startup Pitching by shortlisted Startups for Cohort 1 of iTBI, NITA FIIE and DST Ignite Grant',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: null,
    description: 'Live startup pitching block 1.',
    sortOrder: 12,
  },
  {
    dayLabel: 'Day 2: 15th March, 2026 (Sunday)',
    eventDate: '2026-03-15',
    startTime: '02:00 PM',
    endTime: '03:00 PM',
    title: 'BREAK FOR LUNCH',
    venue: 'Campus Dining',
    speaker: null,
    description: 'Lunch break as per official schedule.',
    sortOrder: 13,
  },
  {
    dayLabel: 'Day 2: 15th March, 2026 (Sunday)',
    eventDate: '2026-03-15',
    startTime: '03:00 PM',
    endTime: '06:00 PM',
    title:
      'Live Startup Pitching by shortlisted Startups for Cohort 1 of iTBI, NITA FIIE and DST Ignite Grant',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: null,
    description: 'Live startup pitching block 2.',
    sortOrder: 14,
  },
  {
    dayLabel: 'Day 2: 15th March, 2026 (Sunday)',
    eventDate: '2026-03-15',
    startTime: '06:00 PM',
    endTime: '07:00 PM',
    title: 'Cultural Program',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: null,
    description: 'Cultural program.',
    sortOrder: 15,
  },
  {
    dayLabel: 'Day 2: 15th March, 2026 (Sunday)',
    eventDate: '2026-03-15',
    startTime: '07:00 PM',
    endTime: '08:00 PM',
    title: 'Prize Distribution and Closing Ceremony',
    venue: 'SV Seminar Hall, NIT Agartala',
    speaker: null,
    description: 'Prize distribution and closing ceremony.',
    sortOrder: 16,
  },
] as const

export async function seedTimeline() {
  const count = await prisma.timelineItem.count()
  if (count > 0) return

  await prisma.timelineItem.createMany({
    data: TIMELINE_SEED,
  })
}

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@ecellnitagartala.in'
  const password = process.env.ADMIN_PASSWORD ?? 'ecell-admin-2026'
  const firstName = process.env.ADMIN_FIRST_NAME ?? 'Portal'
  const lastName = process.env.ADMIN_LAST_NAME ?? 'Admin'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return

  const passwordHash = await Bun.password.hash(password)

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      verified: true,
      role: Role.ADMIN,
    },
  })
}
