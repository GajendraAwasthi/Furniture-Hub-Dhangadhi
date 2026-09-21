# Furniture Hub Dhangadhi

A modern, elegant e-commerce storefront for **Furniture Hub Dhangadhi**, showcasing curated handcrafted furniture collections in Dhangadhi, Kailali, and across Sudurpashchim Province, Nepal.

---

## Features

- **Artisanal Minimalist Design**: Rich Nordic aesthetic, responsive layouts, and curated timber catalog.
- **Single Page Application**: Fast client-side routing with clean URLs and custom 404 handling.
- **Authentication**: Google Sign-In and secure direct customer account login.
- **Post-Login Profile Onboarding**: Interactive delivery location & contact number setup for prompt local deliveries.
- **Integrated Shopping Bag**: Live calculation, festive discount vouchers, and seamless cart state persistence.
- **WhatsApp Concierge**: Direct order verification and delivery scheduling via WhatsApp deep-linking.
- **Customer Reviews**: Interactive customer ratings, review modal, and community feedback.
- **Vercel & Production Ready**: Optimized bundle, zero hardcoded secrets, and SPA rewrites (`vercel.json`).

---

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, Vanilla CSS
- **Bundler & Dev Server**: Vite
- **Deployment**: Vercel SPA
- **Integration Options**: Supabase (Cloud Database & Authentication)

---

## Getting Started Locally

### 1. Prerequisites
- Node.js (v18 or higher)
- npm

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your configuration:
```bash
cp .env.example .env
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Production Build
```bash
npm run build
```
The compiled production bundle will be generated in `dist/`.

---

## Deployment on Vercel

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the Framework Preset to **Vite**.
4. Configure optional environment variables in the Vercel project settings (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SELLER_WHATSAPP_NUMBER`).
5. Deploy! Vercel will automatically use `vercel.json` for client-side routing.

---

## License & Copyright

&copy; 2025-2026 Furniture Hub Dhangadhi. All rights reserved.
