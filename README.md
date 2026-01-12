 # โครงสร้างโปรเจกต์และวิธีการ Deploy

## 1. โครงสร้างไฟล์ (Project Structure)

โปรเจกต์นี้แบ่งออกเป็น 2 ส่วนหลัก คือ **Frontend (React)** และ **Backend (PHP)**

```
Dashboard/
├── public/
│   └── api/                # ไฟล์ Backend PHP จะอยู่ที่นี่
│       ├── config.php      # การตั้งค่าฐานข้อมูล (Database Configuration)
│       ├── db.php          # ไฟล์เชื่อมต่อฐานข้อมูล
│       ├── get_data.php    # API ดึงข้อมูล User
│       └── login.php       # API สำหรับ Login
├── src/                    # ซอร์สโค้ด React
│   ├── App.jsx             # หน้าหลัก
│   └── main.jsx            # จุดเริ่มต้น React
├── vite.config.js          # ตั้งค่า Vite (base: './')
└── dist/                   # (สร้างอัตโนมัติ) โฟลเดอร์สำหรับนำไป Deploy
    ├── index.html
    ├── assets/
    └── api/                # ไฟล์ PHP จะถูก copy มาที่นี่อัตโนมัติ
```

## 2. วิธีการ Deploy (Deployment Steps)

### ขั้นตอนที่ 1: Build โปรเจกต์
รันคำสั่งนี้ใน Terminal เพื่อแปลงโค้ด React เป็น Static files และรวบรวมไฟล์ PHP:
```bash
npm run build
```
เมื่อเสร็จแล้วจะได้โฟลเดอร์ชื่อ `dist`

### ขั้นตอนที่ 2: อัปโหลดขึ้น Server (FTP)
1. เปิดโปรแกรม FTP (เช่น FileZilla) เชื่อมต่อกับ โฮสต์ของคุณ
2. เข้าไปที่โฟลเดอร์ `public_html` หรือ root ของโดเมน
3. อัปโหลด **ทุกอย่างที่อยู่ในโฟลเดอร์ `dist`** ขึ้นไป

### ขั้นตอนที่ 3: ตั้งค่าฐานข้อมูลบน Server
1. บน Server เปิดไฟล์ `api/config.php` (ที่เพิ่งอัปโหลดไป)
2. แก้ไขค่าการเชื่อมต่อให้ตรงกับ Database ของ Host จริง:
   ```php
   $host = "localhost";
   $db_user = "ชื่อ user database ของจริง";
   $db_pass = "รหัสผ่าน database ของจริง";
   $db_name = "ชื่อ database ของจริง";
   ```

## 3. การใช้งาน API
- **GET** `api/get_data.php`: คืนค่า JSON รายชื่อ Users
- **POST** `api/login.php`: รับ JSON `{ "username": "...", "password": "..." }` เพื่อตรวจสอบสิทธิ์
