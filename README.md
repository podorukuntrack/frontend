# PropTrack Frontend

Frontend React untuk sistem manajemen proyek properti real estate.

## Tech Stack
- **React 18** + Vite
- **Tailwind CSS 3** — Styling
- **React Router v6** — Client-side routing
- **Axios** — HTTP client + auto token refresh
- **Recharts** — Dashboard charts
- **Lucide React** — Icon set

## Cara Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Konfigurasi environment
```bash
cp .env.example .env.local
# Edit .env.local sesuai URL backend Anda
```

### 3. Jalankan development server
```bash
npm run dev
```

### 4. Build production
```bash
npm run build
```

## Struktur Folder
```
src/
├── api/
│   ├── client.js        # Axios instance + interceptors (token refresh)
│   └── services.js      # Semua fungsi API endpoint
├── context/
│   └── AuthContext.jsx  # Global auth state (login, logout, user info)
├── components/
│   ├── ui/
│   │   └── index.jsx    # Komponen reusable (Modal, Toast, Pagination, dll)
│   └── layout/
│       ├── Sidebar.jsx
│       └── AppLayout.jsx
├── pages/
│   ├── auth/            # Login, Register
│   ├── dashboard/       # Stats + Charts
│   ├── projects/        # CRUD Proyek
│   ├── clusters/        # CRUD Cluster
│   ├── units/           # List Unit + Bulk Upload
│   ├── assignments/     # CRUD Assignment
│   ├── progress/        # Timeline Progress
│   ├── documentation/   # Upload & Gallery Media
│   ├── users/           # CRUD User
│   └── companies/       # CRUD Perusahaan (super_admin only)
└── utils/
    └── helpers.js       # Format date, status colors, dll
```

## Role & Akses
| Halaman       | super_admin | admin | customer |
|---------------|:-----------:|:-----:|:--------:|
| Dashboard     | ✅          | ✅    | ❌       |
| Perusahaan    | ✅          | ❌    | ❌       |
| Proyek        | ✅          | ✅    | ❌       |
| Cluster       | ✅          | ✅    | ❌       |
| Unit          | ✅          | ✅    | ✅       |
| Assignment    | ✅          | ✅    | ✅       |
| Progress      | ✅          | ✅    | ✅       |
| Dokumentasi   | ✅          | ✅    | ✅       |
| Pengguna      | ✅          | ✅    | ❌       |

## Fitur Utama
- 🔐 JWT Auth dengan auto-refresh token (interceptor Axios)
- 📊 Dashboard dengan Pie Chart & Bar Chart
- 🏗️ CRUD lengkap: Proyek, Cluster, Unit, Assignment, Progress, Dokumentasi, User, Perusahaan
- 📁 Bulk upload unit via JSON
- 📸 Gallery dokumentasi (foto/video/dokumen)
- 🕐 Timeline progress per unit
- 🎨 Dark mode UI, responsive (mobile + desktop)
- 🔔 Toast notification global
- ⚙️ Role-based access control
