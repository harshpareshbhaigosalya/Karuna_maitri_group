# 🐾 Karuna-Maitri Group - NGO Donation Management Platform

<div align="center">

![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**A production-ready Progressive Web App for managing animal welfare NGO donations — live & in daily use.**

[🌐 Live Demo](https://karuna-maitri-group.vercel.app) • [📋 Features](#-features) • [🛠️ Tech Stack](#️-tech-stack) • [🚀 Getting Started](#-getting-started)

</div>

---

## 📖 About

**Karuna-Maitri Group** is a Surendranagar-based animal welfare NGO running daily services like milk-pova (dog feeding), bird care, and cattle welfare.

This platform was built to replace manual record-keeping with a fast, mobile-first PWA that allows NGO volunteers to:
- Record and manage donor entries in real time
- Instantly generate branded Gujarati donation certificates
- Send personalized WhatsApp thank-you messages
- Export full donor data to Excel for record-keeping

> 🚀 **Deployed & actively used in production by real NGO volunteers daily.**

---

## 🎥 Project Demo

<div align="center">

### ▶️ [WATCH KARUNA_MAITRI_GROUP — FULL PROJECT DEMONSTRATION](https://drive.google.com/file/d/1niXEJ0JUTj2EvOqOPBC1OWpMKdOEmsD5/view?usp=sharing)

**🎬 Click here to watch the complete project demonstration**

</div>

---

## ✨ Features

### 🎴 Donation Certificate Generator
- Pixel-perfect Gujarati certificate & appeal flyer generation using **html2canvas**
- Full-bleed branded header/footer banners with custom NGO logo
- One-tap **PNG download** and **WhatsApp sharing**

### 📊 Real-Time Donor Management
- Firestore-backed donor database with live donation tracking
- Interactive donation calendar with month-wise overview
- Analytics dashboard with seva-wise breakdown

### 📱 Progressive Web App (PWA)
- Installable as a native app on Android & iOS
- Custom branded splash screen on launch
- Mobile-first responsive design with Gujarati localization

### 🔔 Smart Reminder System
- Auto-generate annual donor reminders based on occasion type
- WhatsApp reminder message generation with dynamic content

### 🗄️ Data Lifecycle Management
- **UTF-8 BOM Excel CSV export** (Gujarati text renders perfectly in Excel)
- Year-end archive system with cumulative donation total tracking
- Secure 2-step database reset with automatic backup before purge

### ⚙️ Admin Settings Panel
- Manage NGO branding, staff contacts, UPI QR code, and seva types
- Dynamic donation type management (add/edit/remove seva categories)
- Role-based settings with Firestore persistence

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Custom Design System |
| **Backend / Database** | Firebase Firestore (NoSQL), Firebase Auth |
| **Image Export** | html2canvas |
| **Deployment** | Vercel (CI/CD via GitHub) |
| **Integrations** | WhatsApp Web Share API, Web Share API |
| **Data Export** | Excel CSV with UTF-8 BOM encoding |
| **PWA** | Web App Manifest, Custom Splash Screen |
| **Fonts & Icons** | Noto Sans Gujarati (Google Fonts), Lucide React |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore and Authentication enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/harshpareshbhaigosalya/Karuna_maitri_group.git
cd Karuna_maitri_group

# Install dependencies
npm install

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Run Locally

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

---

## 📁 Project Structure

```
src/
├── components/        # Reusable UI components
├── views/             # Page-level views (Home, Dashboard, Settings...)
├── lib/               # Firebase config, DB seed utilities
├── types/             # TypeScript type definitions
├── utils/             # Image compression, helper utilities
└── main.tsx           # App entry point with PWA splash
```

---

## 🌐 Deployment

This project is deployed on **Vercel** with automatic deployments triggered on every push to `main`.

Configured with strict `no-cache` HTTP headers to ensure volunteers always receive the latest version instantly.

---

## 👨‍💻 Developer

**Harsh Gosaliya**

> *"Built with purpose — for the voiceless animals of Surendranagar."*

---

## 📄 License

This project is private and built for **Karuna-Maitri Group, Surendranagar**. All rights reserved.
