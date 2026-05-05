# Rathudan Yönetim Paneli

Rathudan Dijital Ajans için geliştirilmiş tam özellikli kurumsal yönetim sistemi.

## 🚀 Teknoloji Stack

- **Framework:** Next.js 14 (App Router)
- **Dil:** TypeScript
- **Stil:** Tailwind CSS
- **Veritabanı:** Supabase (PostgreSQL)
- **Kimlik Doğrulama:** Supabase Auth
- **Grafikler:** Recharts
- **İkonlar:** Lucide React
- **Deploy:** Vercel

---

## 📦 Modüller

| Modül | Açıklama | Erişim |
|-------|----------|--------|
| Dashboard | Anlık özet, istatistikler | Tüm roller |
| CRM - Müşteriler | Müşteri kayıtları, detay, düzenleme | Admin, Çalışan |
| CRM - Biletler | Destek talepleri, yorumlar, iç notlar | Tüm roller |
| Faturalar | Fatura oluşturma, kalemler, durum takibi | Admin, Çalışan |
| Gelir/Gider | Ön muhasebe, nakit akışı | Admin |
| Paketler | Paket tanımları, müşteri atamaları | Admin, Çalışan |
| Projeler & Görevler | Kanban board, liste görünümü | Admin, Çalışan |
| Görüşmeler | Yüz yüze/online/telefon görüşme raporları | Admin, Çalışan |
| Raporlar | Grafiksel analitik dashboard | Admin |
| Kullanıcılar | Rol yönetimi, kullanıcı aktivasyonu | Süper Admin |

---

## ⚡ Kurulum

### 1. Supabase Kurulumu

1. [supabase.com](https://supabase.com) adresinde proje oluşturun
2. **SQL Editor** açın
3. `supabase/migrations/001_initial_schema.sql` dosyasının tamamını kopyalayıp çalıştırın
4. Project Settings > API'den şu bilgileri kopyalayın:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. İlk Admin Kullanıcısı

1. Supabase Dashboard → **Authentication → Users → Add user**
2. E-posta ve şifre girin
3. Kullanıcı oluşturulduktan sonra **Table Editor → profiles** tablosunda
   bu kullanıcının `role` alanını `super_admin` olarak güncelleyin

### 3. Local Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# .env.local oluştur
cp .env.local.example .env.local
# Dosyayı düzenleyip Supabase bilgilerini girin

# Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

---

## 🌐 Vercel Deploy

### Yöntem 1: Vercel CLI (Hızlı)

```bash
npm install -g vercel
vercel
```

### Yöntem 2: GitHub ile Otomatik Deploy

1. Projeyi GitHub'a push edin:
```bash
git init
git add .
git commit -m "Initial commit - Rathudan Panel"
git remote add origin https://github.com/KULLANICI_ADINIZ/rathudan-panel.git
git push -u origin main
```

2. [vercel.com](https://vercel.com) → **New Project** → GitHub repo'yu seçin

3. **Environment Variables** bölümünde ekleyin:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
   ```

4. **Deploy** butonuna tıklayın

---

## 👥 Rol Yetkileri

| İşlem | Super Admin | Admin | Çalışan | Müşteri |
|-------|:-----------:|:-----:|:-------:|:-------:|
| Müşteri ekle/düzenle | ✅ | ✅ | ❌ | ❌ |
| Bilet oluştur | ✅ | ✅ | ✅ | ✅ |
| Fatura yönet | ✅ | ✅ | Görüntüle | Kendi |
| Gelir/Gider | ✅ | ✅ | ❌ | ❌ |
| Raporlar | ✅ | ✅ | ❌ | ❌ |
| Proje/Görev | ✅ | ✅ | ✅ | ❌ |
| Görüşme raporu | ✅ | ✅ | ✅ | ❌ |
| Kullanıcı yönet | ✅ | ❌ | ❌ | ❌ |

---

## 🎨 Renk Teması

```css
--brand-red: #C2212E
--brand-black: #0d0d0d
--brand-white: #fafafa
```

---

## 📁 Proje Yapısı

```
rathudan-panel/
├── app/
│   ├── auth/login/          # Giriş sayfası
│   ├── dashboard/           # Ana dashboard
│   ├── crm/
│   │   ├── clients/         # Müşteri listesi + detay + yeni + düzenle
│   │   └── tickets/         # Bilet listesi + detay + yeni
│   ├── finance/
│   │   ├── invoices/        # Fatura listesi + detay + yeni
│   │   └── transactions/    # Gelir/gider
│   ├── packages/            # Paket yönetimi
│   ├── projects/            # Projeler + Kanban
│   ├── meetings/            # Görüşme raporları
│   ├── reports/             # Analitik
│   └── admin/users/         # Kullanıcı yönetimi
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx      # Daraltılabilir sidebar
│   │   └── Header.tsx       # Header
│   └── ui/
│       ├── StatCard.tsx     # İstatistik kartı
│       └── StatusBadge.tsx  # Durum badge'leri
├── lib/supabase/            # Supabase client/server/middleware
├── types/                   # TypeScript tip tanımları
└── supabase/migrations/     # SQL şeması
```

---

## 🔒 Güvenlik

- Row Level Security (RLS) tüm tablolarda etkin
- Her rol sadece kendi yetkisindeki verilere erişebilir
- Middleware ile yetkisiz sayfa erişimi engellenir
- Supabase Auth ile güvenli oturum yönetimi

---

Rathudan © 2024 — Tüm hakları saklıdır.
