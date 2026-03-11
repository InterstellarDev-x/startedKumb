import { prisma, ensureAdminUser, seedTimeline } from './db'
import { Role, type User } from './generated/prisma/client'
import type { ServerWebSocket } from 'bun'

type WsRole = 'audience' | 'display' | 'admin'

type WsData = {
  userId: string
  role: WsRole
  isAdmin: boolean
}

type PollQuestionPayload = {
  id: string
  text: string
  options: Record<string, number>
}

const PORT = Number(process.env.PORT ?? 3000)
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const roleFromInput = (role: string): Role | null => {
  if (role === 'participant') return Role.PARTICIPANT
  if (role === 'special_guest') return Role.SPECIAL_GUEST
  if (role === 'startup') return Role.STARTUP
  return null
}

const toClientRole = (role: Role) => {
  if (role === Role.SPECIAL_GUEST) return 'special_guest'
  if (role === Role.STARTUP) return 'startup'
  if (role === Role.ADMIN) return 'admin'
  return 'participant'
}

const fullName = (user: Pick<User, 'firstName' | 'lastName'>) =>
  `${user.firstName} ${user.lastName}`.trim()

const parseName = (name: string) => {
  const normalized = name.trim().replace(/\s+/g, ' ')
  const parts = normalized.split(' ')
  const firstName = parts.shift() || 'User'
  const lastName = parts.join(' ') || 'Member'
  return { firstName, lastName }
}

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  })

const tokenFromReq = (req: Request) => {
  const auth = req.headers.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) return null
  return auth.slice(7).trim()
}

async function authFromReq(req: Request) {
  const token = tokenFromReq(req)
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined)
    return null
  }

  return session
}

const toUserView = (
  user: User & {
    foodCoupon: { code: string } | null
    roomAllotment: {
      room: {
        id: number
        hostel: string
        roomNumber: string
        capacity: number
      }
    } | null
  },
) => ({
  id: user.id,
  name: fullName(user),
  email: user.email,
  role: toClientRole(user.role),
  verified: user.verified,
  foodCouponCode: user.foodCoupon?.code ?? null,
  room: user.roomAllotment
    ? {
        id: user.roomAllotment.room.id,
        hostel: user.roomAllotment.room.hostel,
        roomNumber: user.roomAllotment.room.roomNumber,
        capacity: user.roomAllotment.room.capacity,
      }
    : null,
})

class PollingSystem {
  private audience = new Set<ServerWebSocket<WsData>>()
  private displays = new Set<ServerWebSocket<WsData>>()
  private admins = new Set<ServerWebSocket<WsData>>()

  removeClient(ws: ServerWebSocket<WsData>) {
    this.audience.delete(ws)
    this.displays.delete(ws)
    this.admins.delete(ws)
  }

  private async serializeQuestions(): Promise<PollQuestionPayload[]> {
    const questions = await prisma.pollQuestion.findMany({
      include: {
        options: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return questions.map((question) => ({
      id: question.id,
      text: question.text,
      options: Object.fromEntries(question.options.map((opt) => [opt.optionText, opt.votes])),
    }))
  }

  async addAudience(ws: ServerWebSocket<WsData>) {
    this.removeClient(ws)
    this.audience.add(ws)

    ws.send(
      JSON.stringify({
        type: 'init',
        questions: await this.serializeQuestions(),
      }),
    )
  }

  async addDisplay(ws: ServerWebSocket<WsData>) {
    this.removeClient(ws)
    this.displays.add(ws)

    ws.send(
      JSON.stringify({
        type: 'init',
        questions: await this.serializeQuestions(),
        users: this.audience.size,
      }),
    )
  }

  async addAdmin(ws: ServerWebSocket<WsData>) {
    this.removeClient(ws)
    this.admins.add(ws)

    ws.send(
      JSON.stringify({
        type: 'init',
        questions: await this.serializeQuestions(),
        users: this.audience.size,
      }),
    )
  }

  async createQuestion(text: string, options: string[]) {
    const cleanText = text.trim()
    const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean)

    if (!cleanText || cleanOptions.length < 2) return

    await prisma.pollQuestion.create({
      data: {
        text: cleanText,
        options: {
          create: cleanOptions.map((opt) => ({ optionText: opt })),
        },
      },
    })

    await this.broadcast()
  }

  async vote(userId: string, questionId: string, optionText: string) {
    const selectedOption = await prisma.pollOption.findFirst({
      where: {
        questionId,
        optionText,
      },
    })

    if (!selectedOption) return

    const existingVote = await prisma.pollVote.findFirst({
      where: {
        questionId,
        userId,
      },
    })

    if (existingVote) return

    await prisma.$transaction([
      prisma.pollVote.create({
        data: {
          userId,
          questionId,
          optionId: selectedOption.id,
        },
      }),
      prisma.pollOption.update({
        where: { id: selectedOption.id },
        data: { votes: { increment: 1 } },
      }),
    ])

    await this.broadcast()
  }

  async broadcast() {
    const payload = JSON.stringify({
      type: 'update',
      questions: await this.serializeQuestions(),
      users: this.audience.size,
    })

    for (const ws of this.audience) ws.send(payload)
    for (const ws of this.displays) ws.send(payload)
    for (const ws of this.admins) ws.send(payload)
  }

  async getQuestionsPayload() {
    return this.serializeQuestions()
  }
}

const pollSystem = new PollingSystem()

const safeRoomData = async () => {
  const rooms = await prisma.room.findMany({
    include: {
      allotments: {
        include: {
          user: true,
        },
      },
    },
    orderBy: [{ hostel: 'asc' }, { roomNumber: 'asc' }],
  })

  return rooms.map((room) => ({
    id: room.id,
    hostel: room.hostel,
    roomNumber: room.roomNumber,
    capacity: room.capacity,
    occupancy: room.allotments.length,
    occupants: room.allotments.map((row) => ({
      id: row.user.id,
      name: fullName(row.user),
      email: row.user.email,
      role: toClientRole(row.user.role),
      verified: row.user.verified,
    })),
  }))
}

async function start() {
  await ensureAdminUser()
  await seedTimeline()

  const server = Bun.serve<WsData>({
    port: PORT,
    async fetch(req, serverRef) {
      const url = new URL(req.url)

      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS })
      }

      if (url.pathname === '/ws' && req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
        const token = url.searchParams.get('token')
        let userId = crypto.randomUUID()
        let isAdmin = false

        if (token) {
          const session = await prisma.session.findUnique({
            where: { token },
            include: { user: true },
          })

          if (session && session.expiresAt.getTime() >= Date.now()) {
            userId = session.userId
            isAdmin = session.user.role === Role.ADMIN
          }
        }

        const success = serverRef.upgrade(req, {
          data: {
            userId,
            role: 'audience',
            isAdmin,
          },
        })

        return success ? undefined : json({ error: 'upgrade failed' }, 500)
      }

      if (url.pathname === '/health') {
        return json({ ok: true, service: 'startup-kumbh-api' })
      }

      if (url.pathname === '/api/timeline' && req.method === 'GET') {
        const items = await prisma.timelineItem.findMany({
          orderBy: [{ eventDate: 'asc' }, { sortOrder: 'asc' }],
        })

        return json({
          timeline: items.map((item) => ({
            id: item.id,
            day: item.dayLabel,
            date: item.eventDate,
            time: `${item.startTime} - ${item.endTime}`,
            startTime: item.startTime,
            endTime: item.endTime,
            title: item.title,
            venue: item.venue,
            speaker: item.speaker,
            description: item.description,
          })),
        })
      }

      if (url.pathname === '/api/auth/register' && req.method === 'POST') {
        const body = (await req.json()) as {
          name?: string
          email?: string
          password?: string
          role?: string
        }

        const role = roleFromInput(body.role ?? '')
        const name = (body.name ?? '').trim()
        const email = (body.email ?? '').trim().toLowerCase()
        const password = body.password ?? ''

        if (!role || !name || !email || password.length < 6) {
          return json({ error: 'Invalid registration payload.' }, 400)
        }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
          return json({ error: 'Email already exists.' }, 409)
        }

        const { firstName, lastName } = parseName(name)
        const passwordHash = await Bun.password.hash(password)

        await prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            role,
          },
        })

        return json({ ok: true })
      }

      if (url.pathname === '/api/auth/login' && req.method === 'POST') {
        const body = (await req.json()) as { email?: string; password?: string }
        const email = (body.email ?? '').trim().toLowerCase()
        const password = body.password ?? ''

        if (!email || !password) {
          return json({ error: 'Email and password required.' }, 400)
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            foodCoupon: true,
            roomAllotment: {
              include: { room: true },
            },
          },
        })

        if (!user) {
          return json({ error: 'Invalid credentials.' }, 401)
        }

        const valid = await Bun.password.verify(password, user.passwordHash)
        if (!valid) {
          return json({ error: 'Invalid credentials.' }, 401)
        }

        const token = crypto.randomUUID().replace(/-/g, '')
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

        await prisma.session.create({
          data: {
            token,
            userId: user.id,
            expiresAt,
          },
        })

        return json({
          token,
          user: toUserView(user),
          isAdmin: user.role === Role.ADMIN,
        })
      }

      if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
        const token = tokenFromReq(req)
        if (token) {
          await prisma.session.delete({ where: { token } }).catch(() => undefined)
        }
        return json({ ok: true })
      }

      const auth = await authFromReq(req)

      if (url.pathname === '/api/me' && req.method === 'GET') {
        if (!auth) return json({ error: 'Unauthorized' }, 401)

        const user = await prisma.user.findUnique({
          where: { id: auth.userId },
          include: {
            foodCoupon: true,
            roomAllotment: {
              include: {
                room: true,
              },
            },
          },
        })

        if (!user) return json({ error: 'Unauthorized' }, 401)

        return json({ user: toUserView(user), isAdmin: user.role === Role.ADMIN })
      }

      if (url.pathname === '/api/polls/questions' && req.method === 'GET') {
        return json({ questions: await pollSystem.getQuestionsPayload() })
      }

      if (!auth) {
        return json({ error: 'Unauthorized' }, 401)
      }

      if (url.pathname === '/api/coupons/generate' && req.method === 'POST') {
        const user = await prisma.user.findUnique({
          where: { id: auth.userId },
          include: { foodCoupon: true },
        })

        if (!user) return json({ error: 'Unauthorized' }, 401)
        if (!user.verified) return json({ error: 'Verification required.' }, 403)

        if (user.foodCoupon) {
          return json({ code: user.foodCoupon.code, alreadyGenerated: true })
        }

        const code = `ECELL-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Date.now()
          .toString()
          .slice(-4)}`

        const coupon = await prisma.foodCoupon.create({
          data: {
            userId: user.id,
            code,
          },
        })

        return json({ code: coupon.code, alreadyGenerated: false })
      }

      if (url.pathname === '/api/hostel/my' && req.method === 'GET') {
        const allotment = await prisma.roomAllotment.findUnique({
          where: { userId: auth.userId },
          include: { room: true },
        })

        if (!allotment) return json({ room: null })

        return json({
          room: {
            id: allotment.room.id,
            hostel: allotment.room.hostel,
            roomNumber: allotment.room.roomNumber,
            capacity: allotment.room.capacity,
          },
        })
      }

      if (auth.user.role !== Role.ADMIN) {
        return json({ error: 'Admin access required.' }, 403)
      }

      if (url.pathname === '/api/admin/users' && req.method === 'GET') {
        const users = await prisma.user.findMany({
          where: { role: { not: Role.ADMIN } },
          include: {
            roomAllotment: {
              include: { room: true },
            },
            foodCoupon: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        return json({
          users: users.map((user) => ({
            id: user.id,
            name: fullName(user),
            email: user.email,
            role: toClientRole(user.role),
            verified: user.verified,
            createdAt: user.createdAt,
            room: user.roomAllotment
              ? {
                  id: user.roomAllotment.room.id,
                  hostel: user.roomAllotment.room.hostel,
                  roomNumber: user.roomAllotment.room.roomNumber,
                }
              : null,
            foodCouponCode: user.foodCoupon?.code ?? null,
          })),
        })
      }

      if (url.pathname === '/api/admin/verify' && req.method === 'POST') {
        const body = (await req.json()) as { email?: string }
        const email = (body.email ?? '').trim().toLowerCase()

        if (!email) return json({ error: 'Email required.' }, 400)

        const target = await prisma.user.findUnique({ where: { email } })
        if (!target) return json({ error: 'User not found.' }, 404)

        const updated = await prisma.user.update({
          where: { id: target.id },
          data: { verified: true },
        })

        return json({ ok: true, user: { email: updated.email, verified: updated.verified } })
      }

      if (url.pathname === '/api/admin/rooms' && req.method === 'GET') {
        return json({ rooms: await safeRoomData() })
      }

      if (url.pathname === '/api/admin/rooms' && req.method === 'POST') {
        const body = (await req.json()) as {
          hostel?: string
          roomNumber?: string
          capacity?: number
        }

        const hostel = (body.hostel ?? '').trim()
        const roomNumber = (body.roomNumber ?? '').trim()
        const capacity = Number(body.capacity)

        if (!hostel || !roomNumber || Number.isNaN(capacity) || capacity < 1) {
          return json({ error: 'Invalid room payload.' }, 400)
        }

        try {
          await prisma.room.create({
            data: {
              hostel,
              roomNumber,
              capacity,
            },
          })
        } catch {
          return json({ error: 'Room already exists.' }, 409)
        }

        return json({ ok: true, rooms: await safeRoomData() })
      }

      if (url.pathname === '/api/admin/rooms/assign' && req.method === 'POST') {
        const body = (await req.json()) as {
          email?: string
          roomId?: number
        }

        const email = (body.email ?? '').trim().toLowerCase()
        const roomId = Number(body.roomId)

        if (!email || Number.isNaN(roomId)) {
          return json({ error: 'Email and roomId required.' }, 400)
        }

        const targetUser = await prisma.user.findUnique({ where: { email } })
        if (!targetUser) return json({ error: 'User not found.' }, 404)
        if (!targetUser.verified) return json({ error: 'User is not verified.' }, 400)

        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: {
            allotments: true,
          },
        })

        if (!room) return json({ error: 'Room not found.' }, 404)
        if (room.allotments.length >= room.capacity) return json({ error: 'Room is full.' }, 400)

        await prisma.roomAllotment.upsert({
          where: { userId: targetUser.id },
          create: {
            userId: targetUser.id,
            roomId,
            assignedById: auth.userId,
          },
          update: {
            roomId,
            assignedById: auth.userId,
            assignedAt: new Date(),
          },
        })

        return json({ ok: true, rooms: await safeRoomData() })
      }

      return json({ error: 'Route not found.' }, 404)
    },

    websocket: {
      open(ws) {
        pollSystem.addAudience(ws)
      },

      async message(ws, message) {
        let data: any

        try {
          data = JSON.parse(message.toString())
        } catch {
          return
        }

        if (data.type === 'join_audience') {
          ws.data.role = 'audience'
          await pollSystem.addAudience(ws)
          return
        }

        if (data.type === 'join_display') {
          ws.data.role = 'display'
          await pollSystem.addDisplay(ws)
          return
        }

        if (data.type === 'join_admin') {
          if (!ws.data.isAdmin) return
          ws.data.role = 'admin'
          await pollSystem.addAdmin(ws)
          return
        }

        if (data.type === 'vote' && ws.data.role === 'audience') {
          await pollSystem.vote(ws.data.userId, data.questionId, data.option)
          return
        }

        if (data.type === 'create_question' && ws.data.role === 'admin' && ws.data.isAdmin) {
          await pollSystem.createQuestion(data.text, data.options)
          return
        }
      },

      close(ws) {
        pollSystem.removeClient(ws)
      },
    },
  })

  console.log(`Server running on http://localhost:${server.port}`)
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
