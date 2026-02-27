# 🎡 SpinDecide

**A real-time, multiplayer decision-making web app that makes group choices fun!**

Can't decide where to eat, what to watch, or what to do? Create a room, invite friends, add options, veto what you hate, and let the wheel decide! 🎉

**[Try it live →](https://tonight-production-82b1.up.railway.app)**

---

## ✨ Features

- **🎯 Real-time multiplayer** — Everyone sees updates instantly via polling
- **🎡 Spinning wheel** — Animated canvas wheel with confetti celebration
- **👥 Unlimited participants** — Share a link, no accounts needed
- **✏️ Submit options** — Up to 3 suggestions per person
- **❌ Veto power** — Each person can veto one option they really don't want
- **📱 Mobile-friendly** — Responsive design works on any device
- **🔒 Secure sessions** — HTTP-only cookies with cryptographic session tokens
- **🧹 Auto-cleanup** — Rooms automatically deleted after 24 hours

---

## 🚀 Quick Start

### Using the Live App

1. Visit **[tonight-production-82b1.up.railway.app](https://tonight-production-82b1.up.railway.app)**
2. Choose a category: 🍕 Where to Eat | 🎬 What to Watch | 🎯 What to Do
3. Enter your name and create a room
4. Share the link with friends
5. Everyone adds options and vetoes
6. Spin the wheel and let fate decide!

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Database:** PostgreSQL 15+
- **Styling:** Tailwind CSS
- **Animations:** Canvas API + canvas-confetti
- **Hosting:** Railway
- **Real-time:** HTTP polling (every 2 seconds)

---

## 💻 Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/dil-kenoemii/tonight.git
   cd tonight/spindecide
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/spindecide
   SESSION_SECRET=<64-character-hex-string>
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Generate a session secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Create the database**
   ```bash
   createdb spindecide
   ```

5. **Run migrations**
   ```bash
   npm run migrate
   ```

6. **Start the dev server**
   ```bash
   npm run dev
   ```

7. **Open the app**

   Visit [http://localhost:3000](http://localhost:3000)

---

## 📦 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run migrate    # Run database migrations
npm run cleanup    # Delete old rooms and expired sessions
npm run lint       # Run ESLint
```

---

## 🗄️ Database Schema

Four main tables:

- **`rooms`** — Room codes, categories, status, winner
- **`participants`** — Names, host flag, veto status
- **`options`** — Option text, veto tracking, submitter
- **`sessions`** — Session tokens for authentication

See `lib/migrate.ts` for the complete schema.

---

## 🏗️ Project Structure

```
spindecide/
├── app/
│   ├── api/              # API routes (Room, Options, Veto, Spin)
│   ├── room/[code]/      # Dynamic room page
│   ├── page.tsx          # Homepage with category buttons
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── SpinWheel.tsx     # Animated spinning wheel
│   ├── RoomView.tsx      # Main room interface
│   ├── ResultView.tsx    # Read-only view for late joiners
│   └── ...
├── lib/
│   ├── db.ts             # PostgreSQL connection pool
│   ├── session.ts        # Session management
│   ├── migrate.ts        # Database schema
│   ├── cleanup.ts        # Cleanup job
│   └── ...
├── types/                # TypeScript type definitions
└── middleware.ts         # CORS configuration
```

---

## 🔐 Security Features

- **Session cookies:** HTTP-only, signed with HMAC-SHA256
- **Rate limiting:** In-memory sliding window rate limiter
- **Parameterized queries:** All SQL uses `$1, $2` placeholders to prevent injection
- **Input validation:** Room codes, names, and options are sanitized
- **SSL enforcement:** Production database connections use SSL

---

## 🚢 Deployment

### Deploy to Railway

1. **Connect GitHub repo** to Railway
2. **Add PostgreSQL** database plugin
3. **Set environment variables:**
   - `DATABASE_URL` (auto-set by Railway)
   - `SESSION_SECRET` (64-char hex)
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_APP_URL` (your Railway URL)
4. **Add pre-deploy step:** `npm run migrate`
5. **Create cleanup cron:**
   - New service with start command: `npm run cleanup`
   - Schedule: `0 * * * *` (hourly)
   - Reference `DATABASE_URL` from PostgreSQL

Railway automatically:
- Detects Next.js and builds with `npm run build`
- Starts with `npm start`
- Redeploys when you push to `main`

See [MILESTONES.md](../MILESTONES.md) for detailed deployment steps.

---

## 🎮 How It Works

### Room Lifecycle

1. **Host creates room** → Gets 6-character room code (e.g., `ABC123`)
2. **Participants join** → Via shareable link or room code
3. **Everyone adds options** → Max 3 per person
4. **Everyone can veto** → Exactly 1 veto per person
5. **Host spins wheel** → Cryptographically random selection
6. **Winner announced** → Confetti celebration! 🎊
7. **Auto-cleanup** → Room deleted after 24 hours

### Real-Time Updates

- Client polls `GET /api/rooms/[code]` every 2 seconds
- Server returns full room state (participants, options, status)
- No WebSockets needed — simple HTTP polling works great!

### Spinning Wheel

- Canvas-based animation with 60 FPS
- Ticking sound using Web Audio API
- Winner lands under top pointer (12 o'clock)
- 5-second spin for host, 3-second for participants
- Confetti celebration via `canvas-confetti`

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rooms` | Create new room |
| `GET` | `/api/rooms/[code]` | Get room state |
| `POST` | `/api/rooms/[code]/join` | Join existing room |
| `POST` | `/api/rooms/[code]/options` | Submit option |
| `POST` | `/api/rooms/[code]/options/[id]/veto` | Veto option |
| `POST` | `/api/rooms/[code]/spin` | Spin wheel (host only) |
| `GET` | `/api/recent` | Get recent decisions |
| `GET` | `/api/health` | Health check |

---

## 🐛 Troubleshooting

**"Application Error" on page:**
- Check Railway logs for errors
- Verify `DATABASE_URL` is set
- Ensure migrations ran successfully

**Session doesn't persist:**
- Check `SESSION_SECRET` is 64-character hex string
- Verify `NEXT_PUBLIC_APP_URL` matches your domain exactly (no trailing slash)
- Clear browser cookies and try again

**Database connection error:**
- Verify PostgreSQL is running
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/dbname`
- For Railway, ensure SSL is configured (`ssl: { rejectUnauthorized: false }`)

---

## 📚 Documentation

- **[MILESTONES.md](../MILESTONES.md)** — Project progress tracker (7/7 complete!)
- **[requirements_1.md](../requirements_1.md)** — Full product requirements document
- **[TECHNICAL_SPEC.md](../TECHNICAL_SPEC.md)** — Implementation details
- **[CLAUDE.md](CLAUDE.md)** — Developer guide for working with this codebase

---

## 🎯 Roadmap

SpinDecide is feature-complete! Future enhancements could include:

- Custom room categories
- Persistence for favorite groups
- Custom wheel colors/themes
- Option to allow multiple vetos
- Export decision history

---

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- Built with ❤️ using Next.js, PostgreSQL, and Railway
- Confetti animation by [canvas-confetti](https://github.com/catdad/canvas-confetti)
- Font: [Poppins](https://fonts.google.com/specimen/Poppins) by Google Fonts

---

**Made by a PM learning to code** 🚀

_"The best way to make decisions is to spin a wheel!" — Someone, probably_
