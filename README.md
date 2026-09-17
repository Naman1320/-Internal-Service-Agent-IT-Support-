#  Veridian IT Service Agent — Autonomous Triage & Support Platform
**Assignment 2: Internal Service Agent (IT Support)**  
*Company: Veridian Corp | Operational Week: 21 – 25 September 2026*

[![Live Demo](https://img.shields.io/badge/Live_Demo-HTTPS_Active-success?style=for-the-badge&logo=vercel)](https://836dca98ba049b.lhr.life)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Database](https://img.shields.io/badge/Database-SQLite%20(sql.js)-orange.svg)](https://sql.js.org/)
[![Security](https://img.shields.io/badge/Cybersecurity-Helmet%20%7C%20RateLimit%20%7C%20XSS-shield.svg)]()
[![Presentation](https://img.shields.io/badge/PDF_Deck-10_Slides_Included-purple.svg)](./Veridian_IT_Service_Agent_10_Slide_Presentation.pdf)

> 🌐 **Live Deployed Application URL:** [https://836dca98ba049b.lhr.life](https://836dca98ba049b.lhr.life)  
> *(Fully functional live instance: React frontend + Express API + SQLite database)*

---

##  Executive Summary

**Veridian IT Service Agent** is an enterprise-grade, full-stack IT Helpdesk Triage & Resolution system built for Veridian Corp. The system automates ticket classification, self-service policy fulfillment, policy conflict detection, security escalation, and human helpdesk routing.

It operates strictly against the **Assignment 2 Data Pack** (26 Employee Profiles, 10 Knowledge Base Policies `KB-01` to `KB-10`, Asset Refresh Policy Q2 2026, 10 Historical Ticket Precedents `TK-1042` to `TK-1051`, and 15 Active Employee Requests `REQ-01` to `REQ-15`).

---

##  Solution Architecture & Technology Stack

```
veridian-it-service-agent/
├── backend/                  # Express.js REST API Server
│   ├── database/             # Pure WebAssembly SQLite (sql.js) Wrapper & DB Seed
│   ├── middleware/           # JWT Authentication, RBAC, XSS Sanitization & Rate Limiters
│   ├── routes/               # API Routes (Auth, Agent, Tickets, KB, Dashboard, Users)
│   └── services/             # AgentEngine NLP & Policy Decision Pipeline
├── frontend/                 # React 18 + Vite SPA
│   ├── src/components/       # Responsive Layout & Navigation Modules
│   ├── src/pages/            # AI Chat, My Tickets, Dashboard, KB Editor, User Manager
│   └── src/index.css         # Dark Glassmorphism Design System
└── Veridian_IT_Service_Agent_10_Slide_Presentation.pdf   # 10-Slide Assignment PDF Deck
```

### Stack Components
- **Frontend Client:** React 18, Vite, React Router v6, Glassmorphism Vanilla CSS theme.
- **Backend Server:** Node.js, Express.js, Helmet Security Headers, Rate-Limiting.
- **Database Engine:** `sql.js` (Pure WebAssembly SQLite engine — eliminates native `better-sqlite3` C++ compilation issues across macOS/Windows).
- **AI Decision Engine:** Multi-pattern NLP classifier, TF-IDF Knowledge Base vector search, Entity Parser, and Conflict Resolver.

---

##  Key Features

### 1.  Conversational AI Agent & Natural Triage (`/chat`)
- Addresses employees directly by name and department (e.g., *"Hello Aditi,"*).
- Formats responses in rich Markdown with exact **`KB-XX` policy source citations**.
- Executes self-service actions automatically (password unlock triggers, guest Wi-Fi passes, full-time VPN renewal guidance).

### 2. Policy Conflict Resolution Engine
- **KB-03 vs. Asset Management Policy:** Detects conflicts when a laptop replacement is requested between 3 and 4 years of service (KB-03 3-yr threshold vs. Asset Policy 4-yr refresh cycle).
- Flags policy conflict notes explicitly and references historical precedent **`TK-1043`** (3.2 yrs approved) for auditable human decision-making.

### 3. 3-Tier Outcome Decision Matrix
Every request is evaluated into one of three strict outcomes:
- **`auto_resolve`**: Fully covered by unambiguous KB policy without requiring human intervention.
- **`route_to_human`**: Requires manager sign-off, Security review, or Finance approval (e.g., non-catalog software, phishing incidents, WFH allowances, admin access).
- **`needs_clarification`**: Vague request lacking technical details (e.g. `REQ-15` *"hey can you help, its not working"*).

### 4. Admin Analytics Dashboard & Ticket Controls (`/admin/dashboard`)
- Real-time KPI stats (Active Tickets, Resolution Rate, SLA breaches, Category Breakdown).
- Filterable Ticket Queue (`/admin/tickets`) with override controls.
- Full Knowledge Base CRUD Editor (`/admin/kb`) with live **`⚡ Re-Train AI Model`** action.
- User Management (`/admin/users`) with role promotion, account status toggles, and user deletion.

### 5. Enterprise Cybersecurity Suite
- **XSS & Injection Protection:** Automated middleware sanitizing `<script>`, `javascript:`, and HTML tokens from incoming request payloads.
- **Strict HTTP Security Headers:** Helmet Content-Security-Policy (CSP), `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Brute-Force Lockout:** IP-based rate limiter capping auth endpoints at 15 attempts / 15 minutes.
- **Password Complexity Validation:** Requires 8+ chars with uppercase, lowercase, digit, and special character (`@$!%*?&`).

---

## Quick Start Guide (Run Locally)

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1-Step Single Command Start
Run from the root project directory:

```bash
npm start
```

This single command launches both servers concurrently:
-  **Frontend Web App:** [http://localhost:5174/](http://localhost:5174/) (or `http://localhost:5173/`)
-  **Backend REST API:** [http://localhost:5001/api](http://localhost:5001/api)

---

##  Pre-Seeded Test Login Credentials

| Persona | Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `admin@veridian-corp.example` | `Admin@2026` | Full Admin Dashboard, Ticket Queue, KB Editor, User Management |
| **Employee** | `employee` | `aditi.sharma@veridian-corp.example` | `Employee@2026` | Engineering Employee — Hardware REQ-01 |
| **Employee** | `employee` | `karan.mehta@veridian-corp.example` | `Employee@2026` | Sales Employee — Account Access REQ-03 |
| **Employee** | `employee` | `ananya.reddy@veridian-corp.example` | `Employee@2026` | HR Employee — Security REQ-08 |

---

##  Data Pack Request Verification Matrix (REQ-01 to REQ-15)

All 15 employee requests from the Assignment Data Pack are pre-seeded and tested:

| Req ID | Employee | Category | Initial Request Subject | AI Agent Action Taken | Decision | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Aditi Sharma | Hardware | Laptop dead (3.5 yrs old) | Replacement initiated (3.5 yrs >= 3 yrs KB-03) | `auto_resolve` | `in_progress` |
| **REQ-02** | Vikram Chawla | Network Access | Guest Wi-Fi access for visitor | Self-service kiosk pass guidance issued (KB-07) | `auto_resolve` | `resolved` |
| **REQ-03** | Karan Mehta | Account Access | Account locked out (6 password attempts) | Account unlock request queued (KB-01) | `auto_resolve` | `in_progress` |
| **REQ-04** | Ritu Bhatia | Software | Non-catalog data analysis tool | Submitted for 3-5 day IT Security review (KB-04) | `route_to_human` | `waiting_approval` |
| **REQ-05** | Sanjay Oberoi | Network Access | VPN credentials expired | Guided 90-day VPN self-service renewal (KB-02) | `auto_resolve` | `in_progress` |
| **REQ-06** | Meera Iyer | Hardware | Printer paper jam error (3rd Floor) | Troubleshooting provided; technician dispatched | `route_to_human` | `in_progress` |
| **REQ-07** | Farhan Ali | Hardware | WFH monitor allowance (4 days/wk) | Remote days (4 >= 3) validated; manager sign-off | `route_to_human` | `waiting_approval` |
| **REQ-08** | Ananya Reddy | Security | Phishing email forwarded | Warning issued; escalated to Security Team (KB-09) | `route_to_human` | `escalated` |
| **REQ-09** | Rohit Desai | Email | Mailbox full - cannot send emails | Mailbox cleanup & manager expansion steps (KB-06) | `auto_resolve` | `in_progress` |
| **REQ-10** | Kavya Pillai | Account Access | Finance server admin access | Admin access redirected to Finance + Manager backing | `route_to_human` | `open` |
| **REQ-11** | Nikhil Bansal | Network Access | Contractor VPN access request | Contractor policy identified; manager form requested | `route_to_human` | `waiting_approval` |
| **REQ-12** | Sneha Kulkarni| Account Access | Expense tool login error | Technical login error troubleshooting guided | `auto_resolve` | `in_progress` |
| **REQ-13** | Aman Gupta | Hardware | Laptop screen flickering (2 yrs old) | Device age (2 yrs < 3 yrs) routed to Repair | `route_to_human` | `in_progress` |
| **REQ-14** | Tanya Chopra | Software | Browser extension request | Submitted for IT Security review (KB-04) | `route_to_human` | `waiting_approval` |
| **REQ-15** | Rahul Menon | Unknown | Vague request ("hey can you help") | Prompted employee for specific device & error details | `needs_clarification` | `waiting_response` |

---

##  Presentation & PDF Artifacts

A 10-slide presentation covering system architecture, process flows, AI tool allocation, conflict matrix, and QA results is included:

-  **PDF Presentation File:** [`./Veridian_IT_Service_Agent_10_Slide_Presentation.pdf`](./Veridian_IT_Service_Agent_10_Slide_Presentation.pdf)

---

##  Operational API Endpoints

- `POST /api/agent/chat` — Conversational AI Chat intake.
- `POST /api/agent/evaluate` — Evaluates request and returns strict assignment JSON decision schema.
- `POST /api/agent/train` — Re-indexes KB articles and precedent metrics.
- `POST /api/agent/process-all` — Batch processes all 15 pre-seeded employee requests.
- `GET /api/health` — System health check.

---

##  License & Compliance
Designed and developed for Veridian Corp IT Support Triage Evaluation (Assignment 2). Built with 100% strict policy grounding and zero hallucination.
