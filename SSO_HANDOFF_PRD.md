# PRD — SSO Handoff: รับ Login จาก CRM เข้า Dashboard

> เอกสารนี้เขียนสำหรับ "โปรเจค Dashboard" (`C:\AppServ\www\Dashboard`) โดยเฉพาะ
> เป้าหมาย: ให้ผู้ใช้ที่ login อยู่ในระบบ CRM แล้ว เปิด Dashboard ได้โดย **ไม่ต้อง login ซ้ำ**
> โดยใช้ token จากฐานข้อมูลเดียวกัน (ไม่ใช่การยัด user ปลอม)

---

## 1. Background / บริบทที่ต้องรู้

- **Dashboard** = React 18 + Vite + PHP API, build ด้วย `npm run host:build`
- **CRM** (อีกระบบหนึ่ง) และ **Dashboard** ใช้ **ฐานข้อมูลเดียวกัน**: MySQL `primacom_mini_erp`
  - ตาราง `users` เดียวกัน (field: `id, username, password, first_name, last_name, role, company_id, status`, password เป็น plaintext)
  - ตาราง `user_tokens` เดียวกัน — โครงสร้าง: `user_tokens(user_id, token, expires_at)`
- **CRM ออก token ให้อยู่แล้ว** ทุกครั้งที่ login (insert ลง `user_tokens`, token = 64-char hex, อายุ 30 วัน หรือ ถึงเที่ยงคืนสำหรับ role ที่ถูก geo-fence)
- **สถานะปัจจุบันของ Dashboard auth:**
  - `public/api/login.php` — เทียบ username/password กับตาราง `users` ตรงๆ แล้วเช็ค role whitelist
  - หลัง login **ไม่มี session ฝั่ง server** — เก็บ user object ลง `localStorage.user` แล้ว `src/App.jsx` อ่านจากตรงนั้นอย่างเดียว (ดู `App.jsx` state init จาก `localStorage.getItem('user')`)
  - user object ที่เก็บใน localStorage มี shape:
    ```json
    { "id": 1, "username": "...", "first_name": "...", "last_name": "...", "role": "Telesale", "company_id": 1 }
    ```
  - **role whitelist ที่อนุญาตเข้า Dashboard** (จาก `login.php`, case-insensitive):
    `admin control`, `supervisor telesale`, `telesale`, `admin page`

---

## 2. Goal / สิ่งที่ต้องได้

ผู้ใช้ที่ login CRM อยู่แล้ว คลิกลิงก์ที่ CRM ส่งมา:
```
https://<dashboard-host>/dist/index.html?sso_token=<TOKEN>
```
แล้ว Dashboard ต้อง:
1. รับ `sso_token` จาก URL
2. เอา token ไป verify กับ DB (`user_tokens` + `users`)
3. ถ้าใช้ได้ → เขียน `localStorage.user` แล้วเข้าหน้า dashboard **โดยไม่โผล่หน้า login**
4. ถ้าใช้ไม่ได้ (token หมดอายุ / ไม่มี / role ไม่ผ่าน) → ตกไปหน้า login ปกติ พร้อมข้อความ error

> **หมายเหตุ transport:** ใช้ query string ก่อน hash (`?sso_token=...`) ไม่ใช่ `#/sso?token=` เพราะ Dashboard ใช้ HashRouter การอ่าน query จาก hash จะยุ่งกว่า อ่านจาก `window.location.search` ตรงกว่า

---

## 3. งานที่ต้องทำ (Scope)

### 3.1 Backend — เพิ่มไฟล์ `public/api/sso.php` (ใหม่)

Endpoint รับ token → verify → คืน user object shape เดียวกับ `login.php`

**Contract:**
- **Method:** `GET` หรือ `POST` (รับ `token` จาก query, form, หรือ JSON body)
- **Input:** `token` (string, required)
- **Logic (ลอกจาก CRM `get_authenticated_user()`):**
  ```sql
  SELECT u.id, u.username, u.first_name, u.last_name, u.role, u.company_id, u.status
  FROM user_tokens ut
  JOIN users u ON u.id = ut.user_id
  WHERE ut.token = ? AND ut.expires_at > NOW()
  LIMIT 1
  ```
- **Validation:**
  1. token ว่าง → `{ success:false, message:'Missing token' }`
  2. หา row ไม่เจอ / หมดอายุ → `{ success:false, message:'Token ไม่ถูกต้องหรือหมดอายุ' }`
  3. `u.status !== 'active'` → `{ success:false, message:'บัญชีถูกระงับการใช้งาน' }`
  4. `strtolower(u.role)` ไม่อยู่ใน whitelist (`admin control|supervisor telesale|telesale|admin page`) → `{ success:false, message:'ไม่มีสิทธิ์เข้าใช้งาน Dashboard' }`
- **Output (สำเร็จ)** — shape ต้องตรงกับที่ `login.php` คืน เพื่อให้ frontend reuse ได้:
  ```json
  {
    "success": true,
    "user": {
      "id": 1, "username": "...", "first_name": "...",
      "last_name": "...", "role": "Telesale", "company_id": 1
    }
  }
  ```
- ใช้ `include 'db.php';` แบบเดียวกับ `login.php`, prepared statement เสมอ, `header('Content-Type: application/json')`

### 3.2 Frontend — ดักรับ token ตอนเปิดแอป

แก้ให้แอปเช็ค `sso_token` **ก่อน** ตัดสินใจแสดงหน้า login (ทำใน `src/App.jsx` หรือ helper ที่รันก่อน render)

**พฤติกรรม:**
1. ตอนแอปเริ่ม อ่าน `new URLSearchParams(window.location.search).get('sso_token')`
2. ถ้ามี token:
   - เรียก `POST ./api/sso.php` (body `{ token }`)
   - ถ้า `success` → `localStorage.setItem('user', JSON.stringify(data.user))`, set user state, set default page ตาม role เดิม (Supervisor Telesale → `sales`, อื่นๆ → `dashboard`)
   - **ล้าง token ออกจาก URL** ด้วย `window.history.replaceState({}, '', window.location.pathname)` เพื่อไม่ให้ token ค้างใน address bar / history / bookmark
   - ถ้า `!success` → เคลียร์ token ออกจาก URL, แสดงหน้า login พร้อม error message
3. ถ้าไม่มี token → ทำงานเหมือนเดิมทุกอย่าง (อ่าน `localStorage.user`)

**ข้อควรระวัง:**
- ระหว่างรอ `sso.php` ตอบ ควรโชว์ loading state สั้นๆ อย่าเพิ่ง flash หน้า login
- ถ้ามี `sso_token` ใน URL แต่ `localStorage.user` มีอยู่แล้ว → ให้ token ใน URL ชนะ (login เป็นคนใหม่ที่ CRM ส่งมา) เพื่อกันเคสสลับผู้ใช้

### 3.3 (แนะนำอย่างยิ่ง — ทำ Phase 2 ได้) ปิดรูรั่ว Report API

**ปัญหาปัจจุบัน:** `public/api/reports/*.php` (sales.php, dashboard.php, ฯลฯ) รับ `company_id` จาก query string ตรงๆ **ไม่เช็ค auth เลย** — ใครรู้ URL ก็ดึงยอดขายได้โดยไม่ต้อง login

**สิ่งที่ควรแก้:**
- ให้ report API ทุกตัวเรียก helper `require_auth()` (เพิ่มใหม่ใน `db.php` หรือไฟล์ helper) ที่:
  1. อ่าน token จาก header `Authorization: Bearer <token>` **หรือ** `?token=`
  2. verify แบบเดียวกับ `sso.php`
  3. ถ้าไม่ผ่าน → HTTP 401 หยุดทันที
  4. **ดึง `company_id` จาก token ที่ verify แล้ว ไม่ใช่จาก query string** (กันคนแก้ company_id ดูข้อมูลบริษัทอื่น)
- ฝั่ง frontend ต้องแนบ token ไปกับทุก API call → ต้องเก็บ token ลง localStorage ด้วย (ตอนนี้เก็บแค่ user object) ให้ `sso.php`/`login.php` คืน token กลับมาด้วย แล้ว frontend เก็บไว้แนบ header

> Phase 2 นี้แยกจาก SSO ได้ ถ้าอยากได้ SSO ใช้งานก่อนแล้วค่อยตามด้วย security hardening ก็ทำ 3.1 + 3.2 ให้เสร็จก่อนได้

---

## 4. สิ่งที่ **ไม่ต้อง** ทำ

- ไม่ต้องแก้ตาราง DB ใดๆ (`user_tokens` มีอยู่แล้ว CRM เป็นคนเขียน)
- ไม่ต้องแก้ `login.php` เดิม (หน้า login แบบ username/password ยังใช้ได้ต่อ เป็น fallback)
- ไม่ต้องสร้างระบบ token ของ Dashboard เอง — ใช้ token ของ CRM ที่อยู่ใน `user_tokens` ร่วมกัน

---

## 5. Acceptance Criteria

- [ ] เปิด `.../dist/index.html?sso_token=<token ที่ valid จาก user_tokens>` แล้วเข้า Dashboard ได้เลย ไม่เห็นหน้า login
- [ ] token ถูกลบออกจาก URL หลังใช้เสร็จ (refresh แล้วยังอยู่ได้เพราะ localStorage)
- [ ] token หมดอายุ / มั่ว → ตกไปหน้า login พร้อม error ไม่ค้าง loading
- [ ] user ที่ role ไม่อยู่ใน whitelist → ถูกปฏิเสธด้วยข้อความ "ไม่มีสิทธิ์เข้าใช้งาน Dashboard"
- [ ] ข้อมูลใน Dashboard กรองตาม `company_id` ของ user จาก token ถูกต้อง
- [ ] (Phase 2) เรียก `reports/*.php` โดยไม่มี token → ได้ 401

---

## 6. Contract สรุปสำหรับฝั่ง CRM (อ้างอิง — CRM ทำเองแยก)

CRM จะสร้างลิงก์/ปุ่ม "รายงาน Dashboard" ที่พา user ไป:
```
https://<dashboard-host>/dist/index.html?sso_token=<token>
```
โดย `<token>` คือค่า `token` ปัจจุบันของ user จากตาราง `user_tokens` (ตัวที่ CRM ถืออยู่ใน localStorage ฝั่ง CRM = `authToken`) ไม่ต้องออก token ใหม่ ใช้ตัวเดิมได้เพราะเป็นตารางเดียวกัน

---

## 7. ไฟล์ที่จะแตะ (ฝั่ง Dashboard)

| ไฟล์ | การเปลี่ยนแปลง |
|------|----------------|
| `public/api/sso.php` | **สร้างใหม่** — verify token คืน user |
| `src/App.jsx` | ดักรับ `sso_token` ก่อน render, auto-login |
| `public/api/db.php` (หรือ helper ใหม่) | *(Phase 2)* เพิ่ม `require_auth()` |
| `public/api/reports/*.php` | *(Phase 2)* เรียก `require_auth()`, ใช้ company_id จาก token |
| `src/*` (api layer) | *(Phase 2)* แนบ `Authorization: Bearer` ทุก request |

*หลังแก้เสร็จอย่าลืม `npm run host:build` แล้ว deploy โฟลเดอร์ `dist`*
