import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import './app.css'
import Audience from './pages/audience'
import PollAdmin from './pages/admin'

export type Question = {
  id: string
  text: string
  options: Record<string, number>
}

type UserRole = 'participant' | 'special_guest' | 'startup' | 'admin'
type AppScreen =
  | 'landing'
  | 'register-role'
  | 'register-form'
  | 'login'
  | 'dashboard'
  | 'timeline'
  | 'polling'
  | 'food-coupon'
  | 'hostel'
  | 'admin-verify'
  | 'admin-rooms'
  | 'admin-polls'

type PortalUser = {
  id: string
  name: string
  email: string
  role: UserRole
  verified: boolean
  foodCouponCode: string | null
  room: {
    id: number
    hostel: string
    roomNumber: string
    capacity: number
  } | null
}

type TimelineItem = {
  id: number
  day: string
  date: string
  time: string
  startTime: string
  endTime: string
  title: string
  venue: string
  speaker: string | null
  description: string
}

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  verified: boolean
  createdAt: string
  room: {
    id: number
    hostel: string
    roomNumber: string
  } | null
  foodCouponCode: string | null
}

type RoomItem = {
  id: number
  hostel: string
  roomNumber: string
  capacity: number
  occupancy: number
  occupants: Array<{
    id: string
    name: string
    email: string
    role: string
    verified: boolean
  }>
}

const SESSION_KEY = 'startup-kumbh-session-token'

const ROLE_LABELS: Record<Exclude<UserRole, 'admin'>, string> = {
  participant: 'Participant',
  special_guest: 'Special Guest',
  startup: 'Startup',
}

const DASHBOARD_OPTIONS = [
  {
    id: 'timeline',
    title: 'Timeline',
    description: 'Session schedule and stage timings.',
  },
  {
    id: 'polling',
    title: 'Polling System',
    description: 'Vote and interact during live sessions.',
  },
  {
    id: 'food-coupon',
    title: 'Food Coupon',
    description: 'Generate your meal coupon after verification.',
  },
  {
    id: 'hostel',
    title: 'Hostel Accommodation',
    description: 'Check your room allotment status.',
  },
] as const

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const toWsUrl = (base: string) => {
  const parsed = new URL(base)
  const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${parsed.host}/ws`
}

async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers ?? {})

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  let payload: any = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`)
  }

  return payload as T
}

export function App() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY))

  const [user, setUser] = useState<PortalUser | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [rooms, setRooms] = useState<RoomItem[]>([])

  const [selectedRole, setSelectedRole] = useState<Exclude<UserRole, 'admin'> | null>(null)
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [adminSearchEmail, setAdminSearchEmail] = useState('')
  const [adminRoomUserEmail, setAdminRoomUserEmail] = useState('')
  const [roomHostel, setRoomHostel] = useState('Boys Hostel A')
  const [roomNumber, setRoomNumber] = useState('')
  const [roomCapacity, setRoomCapacity] = useState('2')

  const [uiError, setUiError] = useState('')
  const [uiInfo, setUiInfo] = useState('')

  const [questions, setQuestions] = useState<Question[]>([])
  const [connectedUsers, setConnectedUsers] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [pollError, setPollError] = useState('')
  const [votedQuestionIds, setVotedQuestionIds] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)

  const wsEndpoint = useMemo(() => toWsUrl(API_BASE), [])
  const isAdmin = user?.role === 'admin'

  const activePollRole: 'admin' | 'audience' = isAdmin && screen === 'admin-polls' ? 'admin' : 'audience'

  const navigate = (target: AppScreen) => {
    setScreen(target)
    setUiError('')
    setUiInfo('')
  }

  const clearAuthForms = () => {
    setRegisterName('')
    setRegisterEmail('')
    setRegisterPassword('')
    setLoginEmail('')
    setLoginPassword('')
  }

  const loadTimeline = async () => {
    try {
      const data = await apiRequest<{ timeline: TimelineItem[] }>('/api/timeline')
      setTimeline(data.timeline)
    } catch (error) {
      setUiError((error as Error).message)
    }
  }

  const loadMe = async (currentToken: string) => {
    const data = await apiRequest<{ user: PortalUser; isAdmin: boolean }>('/api/me', {}, currentToken)
    setUser(data.user)
  }

  const loadAdminData = async (currentToken: string) => {
    const [usersPayload, roomsPayload] = await Promise.all([
      apiRequest<{ users: AdminUser[] }>('/api/admin/users', {}, currentToken),
      apiRequest<{ rooms: RoomItem[] }>('/api/admin/rooms', {}, currentToken),
    ])

    setAdminUsers(usersPayload.users)
    setRooms(roomsPayload.rooms)
  }

  useEffect(() => {
    loadTimeline()
  }, [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      sessionStorage.removeItem(SESSION_KEY)
      return
    }

    sessionStorage.setItem(SESSION_KEY, token)

    loadMe(token)
      .then(() => undefined)
      .catch((error) => {
        setUiError((error as Error).message)
        setToken(null)
        setUser(null)
      })
  }, [token])

  useEffect(() => {
    if (!token || !isAdmin) return

    loadAdminData(token).catch((error) => {
      setUiError((error as Error).message)
    })
  }, [token, isAdmin])

  useEffect(() => {
    const socketUrl = token ? `${wsEndpoint}?token=${encodeURIComponent(token)}` : wsEndpoint
    const ws = new WebSocket(socketUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setPollError('')
      ws.send(JSON.stringify({ type: `join_${activePollRole}` }))
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    ws.onerror = () => {
      setPollError('Polling socket unavailable. Start backend on ws://localhost:3000')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (Array.isArray(data.questions)) {
          setQuestions(data.questions)
        }
        if (typeof data.users === 'number') {
          setConnectedUsers(data.users)
        }
      } catch {
        setPollError('Malformed polling payload received from backend.')
      }
    }

    return () => ws.close()
  }, [wsEndpoint, token])

  useEffect(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({ type: `join_${activePollRole}` }))
  }, [activePollRole])

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/api/auth/logout', { method: 'POST' }, token)
      }
    } catch {
      // best-effort
    }

    setToken(null)
    setUser(null)
    setAdminUsers([])
    setRooms([])
    setSelectedRole(null)
    setVotedQuestionIds(new Set())
    clearAuthForms()
    navigate('landing')
  }

  const handleRegister = async (event: Event) => {
    event.preventDefault()

    if (!selectedRole) {
      setUiError('Please select a role before registration.')
      return
    }

    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim().toLowerCase(),
          password: registerPassword,
          role: selectedRole,
        }),
      })

      setUiError('')
      setUiInfo('Registration successful. Please login now.')
      setSelectedRole(null)
      setRegisterName('')
      setRegisterEmail('')
      setRegisterPassword('')
      setScreen('login')
    } catch (error) {
      setUiError((error as Error).message)
    }
  }

  const handleLogin = async (event: Event) => {
    event.preventDefault()

    try {
      const data = await apiRequest<{ token: string; user: PortalUser; isAdmin: boolean }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      })

      setToken(data.token)
      setUser(data.user)
      clearAuthForms()
      setUiError('')
      setUiInfo(`Welcome ${data.user.name}.`)
      setScreen('dashboard')
    } catch (error) {
      setUiError((error as Error).message)
    }
  }

  const verifyUserByEmail = async (event: Event) => {
    event.preventDefault()
    if (!token) return

    try {
      await apiRequest(
        '/api/admin/verify',
        {
          method: 'POST',
          body: JSON.stringify({ email: adminSearchEmail.trim().toLowerCase() }),
        },
        token,
      )

      setAdminSearchEmail('')
      setUiError('')
      setUiInfo('User verified successfully.')
      await loadAdminData(token)
    } catch (error) {
      setUiError((error as Error).message)
    }
  }

  const addRoom = async (event: Event) => {
    event.preventDefault()
    if (!token) return

    try {
      const data = await apiRequest<{ rooms: RoomItem[] }>(
        '/api/admin/rooms',
        {
          method: 'POST',
          body: JSON.stringify({
            hostel: roomHostel.trim(),
            roomNumber: roomNumber.trim(),
            capacity: Number(roomCapacity),
          }),
        },
        token,
      )

      setRooms(data.rooms)
      setRoomNumber('')
      setRoomCapacity('2')
      setUiError('')
      setUiInfo('Room added successfully.')
    } catch (error) {
      setUiError((error as Error).message)
    }
  }

  const assignRoomToUser = async (roomId: number) => {
    if (!token) return

    try {
      const data = await apiRequest<{ rooms: RoomItem[] }>(
        '/api/admin/rooms/assign',
        {
          method: 'POST',
          body: JSON.stringify({
            email: adminRoomUserEmail.trim().toLowerCase(),
            roomId,
          }),
        },
        token,
      )

      setRooms(data.rooms)
      setAdminRoomUserEmail('')
      setUiError('')
      setUiInfo('Room assigned successfully.')
      await loadAdminData(token)
    } catch (error) {
      setUiError((error as Error).message)
    }
  }

  const generateFoodCoupon = async () => {
    if (!token || !user) return

    try {
      const data = await apiRequest<{ code: string; alreadyGenerated: boolean }>(
        '/api/coupons/generate',
        { method: 'POST' },
        token,
      )

      setUiError('')
      setUiInfo(
        data.alreadyGenerated
          ? `Coupon already generated: ${data.code}`
          : `Food coupon generated: ${data.code}`,
      )

      await loadMe(token)
    } catch (error) {
      setUiError((error as Error).message)
    }
  }

  const sendVote = (questionId: string, option: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({ type: 'vote', questionId, option }))

    setVotedQuestionIds((current) => {
      const next = new Set(current)
      next.add(questionId)
      return next
    })
  }

  const createQuestion = (text: string, options: string[]) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(JSON.stringify({ type: 'create_question', text, options }))

    const optimistic: Question = {
      id: `local-${Date.now()}`,
      text,
      options: Object.fromEntries(options.map((opt) => [opt, 0])),
    }

    setQuestions((current) => [optimistic, ...current])
  }

  const openDashboardModule = (moduleId: (typeof DASHBOARD_OPTIONS)[number]['id']) => {
    if (!user || !user.verified) {
      setUiError('Account not verified. Please visit nearest reception desk for verification.')
      return
    }

    if (moduleId === 'timeline') navigate('timeline')
    if (moduleId === 'polling') navigate('polling')
    if (moduleId === 'food-coupon') navigate('food-coupon')
    if (moduleId === 'hostel') navigate('hostel')
  }

  const canUseModules = Boolean(user?.verified)

  const usersByRole = {
    participant: adminUsers.filter((item) => item.role === 'participant').length,
    special_guest: adminUsers.filter((item) => item.role === 'special_guest').length,
    startup: adminUsers.filter((item) => item.role === 'startup').length,
  }

  const verifiedUsers = adminUsers.filter((item) => item.verified).length

  return (
    <div className="event-shell">
      <header className="event-header">
        <div>
          <p className="brand-eyebrow">Startup Kumbh 2026 | E-Cell NIT Agartala</p>
          <h1>The Biggest Startup Event Of Tripura</h1>
          <p className="brand-copy">
            Registration, verification, live polling, food coupons and hostel operations from one
            unified portal.
          </p>
        </div>
        <div className="header-quick-meta">
          <span className="meta-pill">14th & 15th March 2026</span>
          <span className={`meta-pill ${isConnected ? 'ok' : 'warn'}`}>
            Poll Socket: {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </header>

      <section className="top-actions">
        {user ? (
          <>
            <button className="secondary" onClick={() => navigate('dashboard')} type="button">
              Dashboard
            </button>
            <button className="secondary" onClick={logout} type="button">
              Logout
            </button>
          </>
        ) : (
          <>
            <button className="secondary" onClick={() => navigate('landing')} type="button">
              Home
            </button>
            <button className="secondary" onClick={() => navigate('login')} type="button">
              Login
            </button>
          </>
        )}
      </section>

      {uiError ? <p className="flash error">{uiError}</p> : null}
      {uiInfo ? <p className="flash info">{uiInfo}</p> : null}
      {pollError ? <p className="flash warn">{pollError}</p> : null}

      {screen === 'landing' && (
        <main className="screen-grid landing-grid">
          <article className="panel landing-hero">
            <div className="landing-kicker">
              <span>Startup Kumbh 2026</span>
              <span>NIT Agartala</span>
            </div>

            <h2>
              Build.
              <br />
              Pitch.
              <br />
              Scale.
            </h2>

            <p className="landing-subtitle">
              Join Tripura&apos;s flagship startup stage with incubation support, live pitching and
              direct networking with founders, experts and ecosystem leaders.
            </p>

            <div className="landing-event-strip">
              <p>14th & 15th March 2026</p>
              <p>National Institute of Technology, Agartala</p>
              <strong>Funding Opportunities up to 10 Lakhs Per Startup</strong>
            </div>

            <div className="cta-row">
              <button onClick={() => navigate('register-role')} type="button">
                Register Now
              </button>
              <button className="secondary" onClick={() => navigate('login')} type="button">
                Login Portal
              </button>
            </div>
          </article>

          <article className="panel landing-audience">
            <h3>Who Should Join</h3>
            <div className="audience-tags">
              <span>Participants</span>
              <span>Special Guests</span>
              <span>Startups</span>
            </div>
            <p>
              From student founders and early-stage teams to mentors and startup leaders, this
              portal gives you one smooth event experience.
            </p>
          </article>

          <article className="panel stats landing-stats">
            <h3>Live Registration Snapshot</h3>
            <div className="stats-grid">
              <div>
                <span>Participants</span>
                <strong>{usersByRole.participant}</strong>
              </div>
              <div>
                <span>Special Guests</span>
                <strong>{usersByRole.special_guest}</strong>
              </div>
              <div>
                <span>Startups</span>
                <strong>{usersByRole.startup}</strong>
              </div>
              <div>
                <span>Verified</span>
                <strong>{verifiedUsers}</strong>
              </div>
            </div>
          </article>

          <article className="panel landing-timeline">
            <div className="landing-timeline-head">
              <h3>Event Timeline Preview</h3>
              <button className="secondary" onClick={() => navigate('timeline')} type="button">
                View Full Timeline
              </button>
            </div>
            <div className="landing-timeline-list">
              {timeline.slice(0, 5).map((item) => (
                <article className="landing-timeline-item" key={item.id}>
                  <p>{item.day}</p>
                  <h4>{item.title}</h4>
                  <span>{item.time}</span>
                  <span>{item.venue}</span>
                </article>
              ))}
            </div>
          </article>
        </main>
      )}

      {screen === 'register-role' && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 2</p>
            <h2>Select Registration Type</h2>
            <div className="role-chooser">
              {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((role) => (
                <button
                  className={selectedRole === role ? 'active' : 'secondary'}
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  type="button"
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
            <div className="cta-row">
              <button disabled={!selectedRole} onClick={() => navigate('register-form')} type="button">
                Continue Registration
              </button>
              <button className="secondary" onClick={() => navigate('landing')} type="button">
                Back
              </button>
            </div>
          </article>
        </main>
      )}

      {screen === 'register-form' && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 3</p>
            <h2>Register {selectedRole ? ROLE_LABELS[selectedRole] : ''}</h2>
            <form className="form-grid" onSubmit={handleRegister}>
              <label>
                Full Name
                <input
                  onInput={(e) => setRegisterName((e.target as HTMLInputElement).value)}
                  placeholder="Enter full name"
                  required
                  value={registerName}
                />
              </label>
              <label>
                Email
                <input
                  onInput={(e) => setRegisterEmail((e.target as HTMLInputElement).value)}
                  placeholder="example@email.com"
                  required
                  type="email"
                  value={registerEmail}
                />
              </label>
              <label>
                Password
                <input
                  onInput={(e) => setRegisterPassword((e.target as HTMLInputElement).value)}
                  placeholder="Minimum 6 characters"
                  required
                  type="password"
                  value={registerPassword}
                />
              </label>
              <div className="cta-row">
                <button type="submit">Create Account</button>
                <button className="secondary" onClick={() => navigate('login')} type="button">
                  Go to Login
                </button>
              </div>
            </form>
          </article>
        </main>
      )}

      {screen === 'login' && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 3</p>
            <h2>Login Portal</h2>
            <form className="form-grid" onSubmit={handleLogin}>
              <label>
                Email
                <input
                  onInput={(e) => setLoginEmail((e.target as HTMLInputElement).value)}
                  placeholder="Email"
                  required
                  type="email"
                  value={loginEmail}
                />
              </label>
              <label>
                Password
                <input
                  onInput={(e) => setLoginPassword((e.target as HTMLInputElement).value)}
                  placeholder="Password"
                  required
                  type="password"
                  value={loginPassword}
                />
              </label>
              <div className="cta-row">
                <button type="submit">Login</button>
                <button className="secondary" onClick={() => navigate('register-role')} type="button">
                  Register Instead
                </button>
              </div>
            </form>
            <p className="meta-note">Admin login is configured from backend environment variables.</p>
          </article>
        </main>
      )}

      {screen === 'dashboard' && user && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 4</p>
            <h2>{isAdmin ? 'Admin Dashboard' : 'User Dashboard'}</h2>
            {!isAdmin ? (
              <p className="meta-note">
                {user.name} | {ROLE_LABELS[user.role as Exclude<UserRole, 'admin'>]} | Verification:{' '}
                <strong>{user.verified ? 'Verified' : 'Pending at Reception'}</strong>
              </p>
            ) : (
              <p className="meta-note">Admin can manage verification, rooms and polling setup.</p>
            )}
          </article>

          {!isAdmin && (
            <article className="panel">
              <div className="dashboard-options">
                {DASHBOARD_OPTIONS.map((option) => (
                  <button
                    className={`module-card ${canUseModules ? '' : 'locked'}`}
                    key={option.id}
                    onClick={() => openDashboardModule(option.id)}
                    type="button"
                  >
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                    <span>{canUseModules ? 'Open' : 'Visit reception to unlock'}</span>
                  </button>
                ))}
              </div>
            </article>
          )}

          {isAdmin && (
            <article className="panel">
              <div className="dashboard-options">
                <button className="module-card" onClick={() => navigate('admin-verify')} type="button">
                  <h3>Screen 9: Verify User</h3>
                  <p>Verify attendees by email at reception.</p>
                  <span>Open</span>
                </button>
                <button className="module-card" onClick={() => navigate('admin-rooms')} type="button">
                  <h3>Screen 10: Room Management</h3>
                  <p>Add rooms and assign users.</p>
                  <span>Open</span>
                </button>
                <button className="module-card" onClick={() => navigate('admin-polls')} type="button">
                  <h3>Screen 11: Poll Questions</h3>
                  <p>Create and publish live polling questions.</p>
                  <span>Open</span>
                </button>
              </div>
            </article>
          )}
        </main>
      )}

      {screen === 'timeline' && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 5</p>
            <h2>Event Timeline</h2>
            <div className="timeline-list">
              {timeline.map((item) => (
                <article className="timeline-item" key={item.id}>
                  <p>{item.day}</p>
                  <h3>
                    {item.time} | {item.title}
                  </h3>
                  <strong>{item.venue}</strong>
                  <span>{item.speaker ? `Speaker: ${item.speaker}. ` : ''}{item.description}</span>
                </article>
              ))}
            </div>
          </article>
        </main>
      )}

      {screen === 'polling' && !isAdmin && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 6</p>
            <h2>Live Polling</h2>
            <p className="meta-note">Audience online: {connectedUsers}</p>
          </article>
          <Audience onVote={sendVote} questions={questions} votedQuestionIds={votedQuestionIds} />
        </main>
      )}

      {screen === 'food-coupon' && user && !isAdmin && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 7</p>
            <h2>Food Coupon Generator</h2>
            <p className="meta-note">
              {user.verified
                ? 'Verified account can generate one coupon code.'
                : 'Verification required before coupon generation.'}
            </p>
            <div className="cta-row">
              <button disabled={!user.verified} onClick={generateFoodCoupon} type="button">
                Generate Coupon
              </button>
            </div>
            {user.foodCouponCode ? (
              <div className="coupon-box">
                <span>Your Coupon</span>
                <strong>{user.foodCouponCode}</strong>
              </div>
            ) : null}
          </article>
        </main>
      )}

      {screen === 'hostel' && user && !isAdmin && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 8</p>
            <h2>Room Allotment</h2>
            {!user.verified ? (
              <p className="meta-note">Visit reception for verification before room allotment.</p>
            ) : user.room ? (
              <div className="room-box">
                <p>Hostel: {user.room.hostel}</p>
                <p>Room: {user.room.roomNumber}</p>
                <p>Capacity: {user.room.capacity}</p>
              </div>
            ) : (
              <p className="meta-note">Room not allotted yet. Contact admin desk.</p>
            )}
          </article>
        </main>
      )}

      {screen === 'admin-verify' && isAdmin && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 9</p>
            <h2>Reception Verification</h2>
            <form className="form-grid" onSubmit={verifyUserByEmail}>
              <label>
                User Email
                <input
                  onInput={(e) => setAdminSearchEmail((e.target as HTMLInputElement).value)}
                  placeholder="registered@email.com"
                  required
                  type="email"
                  value={adminSearchEmail}
                />
              </label>
              <div className="cta-row">
                <button type="submit">Verify User</button>
              </div>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.email}</td>
                      <td>{item.role}</td>
                      <td>{item.verified ? 'Verified' : 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </main>
      )}

      {screen === 'admin-rooms' && isAdmin && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 10</p>
            <h2>Room Management</h2>
            <form className="form-grid" onSubmit={addRoom}>
              <label>
                Hostel Name
                <input
                  onInput={(e) => setRoomHostel((e.target as HTMLInputElement).value)}
                  placeholder="Hostel name"
                  required
                  value={roomHostel}
                />
              </label>
              <label>
                Room Number
                <input
                  onInput={(e) => setRoomNumber((e.target as HTMLInputElement).value)}
                  placeholder="Room number"
                  required
                  value={roomNumber}
                />
              </label>
              <label>
                Capacity
                <input
                  min="1"
                  onInput={(e) => setRoomCapacity((e.target as HTMLInputElement).value)}
                  required
                  type="number"
                  value={roomCapacity}
                />
              </label>
              <div className="cta-row">
                <button type="submit">Add Room</button>
              </div>
            </form>

            <label className="assign-label">
              Assign Room to Email
              <input
                onInput={(e) => setAdminRoomUserEmail((e.target as HTMLInputElement).value)}
                placeholder="user@email.com"
                type="email"
                value={adminRoomUserEmail}
              />
            </label>

            <div className="room-list">
              {rooms.map((room) => (
                <article className="room-card" key={room.id}>
                  <h3>
                    {room.hostel} - {room.roomNumber}
                  </h3>
                  <p>
                    Occupancy: {room.occupancy}/{room.capacity}
                  </p>
                  <button
                    className="secondary"
                    disabled={room.occupancy >= room.capacity}
                    onClick={() => assignRoomToUser(room.id)}
                    type="button"
                  >
                    Assign from Email
                  </button>
                </article>
              ))}
            </div>
          </article>
        </main>
      )}

      {screen === 'admin-polls' && isAdmin && (
        <main className="screen-grid">
          <article className="panel">
            <p className="hero-tag">Screen 11</p>
            <h2>Admin Poll Question Manager</h2>
            <p className="meta-note">Connection: {isConnected ? 'Live' : 'Offline'}</p>
          </article>
          <PollAdmin isConnected={isConnected} onCreateQuestion={createQuestion} questions={questions} />
        </main>
      )}
    </div>
  )
}
