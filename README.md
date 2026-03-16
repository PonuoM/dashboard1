# 📊 Dashboard - Sales Report System

โปรเจกต์ Dashboard สำหรับแสดงรายงานยอดขายและข้อมูลธุรกิจ

---

## 1. โครงสร้างไฟล์ (Project Structure)

โปรเจกต์นี้แบ่งออกเป็น 2 ส่วนหลัก คือ **Frontend (React)** และ **Backend (PHP)**

```
Dashboard/
├── public/
│   ├── assets/                  # Static Assets (images, fonts)
│   └── api/                     # Backend PHP APIs
│       ├── config.php           # Database Configuration (auto-generated)
│       ├── config.dev.php       # DEV config template
│       ├── config.prod.php      # PROD config template
│       ├── db.php               # Database Connection
│       ├── login.php            # Login API
│       └── reports/             # Report APIs
│           ├── sales.php        # Sales Report API (Telesale)
│           ├── dashboard.php    # Dashboard Overview API
│           └── targets.php      # Target Management API
├── src/
│   ├── components/              # Reusable Components
│   │   ├── Layout/              # Layout, Sidebar, Header
│   │   ├── Cards/               # Summary Cards
│   │   ├── Charts/              # Chart Components
│   │   ├── Tables/              # Data Tables
│   │   ├── UI/                  # Common UI (Select, Button, Modal)
│   │   └── Insights/            # Insight Components
│   ├── pages/                   # Page Components (แยกตามหมวด)
│   │   ├── Dashboard/           # หน้า Dashboard Overview
│   │   ├── SalesReport/         # หน้ารายงานยอดขาย (Telesale)
│   │   └── TargetManagement/    # หน้าจัดการเป้าหมาย
│   ├── hooks/                   # Custom React Hooks (TODO)
│   ├── context/                 # React Context - Auth, Theme (TODO)
│   ├── App.jsx                  # Main App with Routes
│   ├── Login.jsx                # Login Page
│   └── main.jsx                 # React Entry Point
├── dist/                        # Production Build (auto-generated)
└── vite.config.js               # Vite Configuration
```

---

## 2. 🗂️ หมวดหมู่หน้า (Page Categories)

Sidebar จะแบ่งเป็น **Dropdown หมวดหมู่** ดังนี้:

### 📈 Dashboard (ภาพรวม)
| หน้า | Path | คำอธิบาย |
|------|------|----------|
| Company Overview | `/` | ภาพรวมยอดขายบริษัท ประจำเดือน/ปี |

### 📊 Report: Telesale
> รายงานเฉพาะฝ่าย Telesale

| หน้า | Path | คำอธิบาย |
|------|------|----------
| รายงานรายเดือน | `/sales-report` | ยอดขายรายบุคคล (Telesale & Supervisor) |
| เป้าหมายการขาย | `/target-management` | จัดการ Target รายบุคคล |
| *(เพิ่มในอนาคต)* | - | รายงานเปรียบเทียบ, Performance, ฯลฯ |

### � Report: Admin/Operations (อนาคต)
> รายงานสำหรับ Admin, Operations

| หน้า | Path | คำอธิบาย |
|------|------|----------|
| *(ยังไม่มี)* | - | สถานะออเดอร์, จัดส่ง, COD ฯลฯ |

### ⚙️ Settings (อนาคต)
| หน้า | Path | คำอธิบาย |
|------|------|----------|
| *(ยังไม่มี)* | - | ตั้งค่าระบบ, Users, Permissions |

---

## 3. 🔧 วิธีการ Development

### ติดตั้ง Dependencies
```bash
npm install
```

### รัน Development Server
```bash
npm run dev
```

### Build สำหรับ Production
```bash
npm run build          # Build ใช้ config local
npm run host:build     # Build สำหรับ upload ขึ้น server จริง
```

---

## 4. 🔧 Build Configuration

| Command | ใช้สำหรับ | dist/config.php |
|---------|----------|-----------------|
| `npm run dev` | รัน dev server บน local | - |
| `npm run build` | Build สำหรับทดสอบ local | DEV config |
| **`npm run host:build`** | **Build สำหรับ upload ขึ้น server จริง** | **PROD config** |

---

## 5. วิธีการ Deploy

1. รันคำสั่ง **`npm run host:build`**
2. อัปโหลด **ทุกอย่างในโฟลเดอร์ `dist`** ขึ้น Server
3. เสร็จสิ้น!

---

## 6. ⚠️ กฎสำคัญที่ต้องจำ (Important Rules)

### 🔴 กฎบังคับ (MUST FOLLOW)

| # | กฎ | รายละเอียด |
|---|-----|-----------|
| 1 | **Company Filter** | ข้อมูลต้องกรองตาม `company_id` ของ User ที่ Login **เสมอ** |
| 2 | **Parent Order ID** | เมื่อ JOIN `orders` กับ `order_items` ต้องใช้ `oi.parent_order_id = o.id` **เสมอ** |

### 🟡 ข้อสังเกต (NOTES)

| # | หัวข้อ | รายละเอียด |
|---|-------|-----------|
| 1 | **Cancelled Orders** | ต้องถามก่อนว่าจะรวม/ไม่รวม order ที่ยกเลิก |
| 2 | **Role Filter** | Dashboard แต่ละตัวอาจกรอง Role ต่างกัน |
| 3 | **Product Categories** | ปุ๋ย = `category LIKE '%ปุ๋ย%'`, ชีวภัณฑ์ = `category = 'ชีวภัณฑ์'` |
| 4 | **Freebies** | บาง report อาจต้องรวม/ไม่รวมของแถม (`is_freebie`) |

---

## 7. การใช้งาน API

### Login API
- **POST** `api/login.php`
- Body: `{ "username": "...", "password": "..." }`

### Dashboard API
- **GET** `api/reports/dashboard.php`
- Parameters: `company_id`, `month`, `year`, `all_provinces` (optional)

### Sales Report API
- **GET** `api/reports/sales.php`
- Parameters: `company_id`, `month`, `year`

### Targets API
- **GET/POST** `api/reports/targets.php`
- Parameters: `company_id`, `month`, `year`, `user_id`

---

## 8. Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** PHP 8 + MySQL/MariaDB
- **Styling:** Tailwind CSS + Custom CSS (Glassmorphism)
- **Font:** Kanit (Thai)
- **Icons:** Material Symbols

---

## 9. 🎨 Design System

| Element | Value |
|---------|-------|
| Primary Color | `#22c55e` (Green) |
| Font Family | `Kanit` |
| Card Style | Glassmorphism (`glass-card`) |
| Border Radius | `rounded-2xl` (16px) |

---

*Last Updated: January 13, 2026*
