<div align="center">
  <img src="./public/favicon.png" alt="NariRide Safety Logo" width="150" style="margin-bottom: 20px;" />

  <h1>🛡️ NariRide Safety</h1>
  <p><strong>Empowering safe, reliable, and secure rides for women everywhere.</strong></p>

  <p>
    <a href="https://github.com/yourusername/nariride-safety/issues"><img src="https://img.shields.io/github/issues/yourusername/nariride-safety?style=for-the-badge&color=purple" alt="Issues" /></a>
    <a href="https://github.com/yourusername/nariride-safety/network/members"><img src="https://img.shields.io/github/forks/yourusername/nariride-safety?style=for-the-badge&color=pink" alt="Forks" /></a>
    <a href="https://github.com/yourusername/nariride-safety/stargazers"><img src="https://img.shields.io/github/stars/yourusername/nariride-safety?style=for-the-badge&color=magenta" alt="Stars" /></a>
    <a href="https://github.com/yourusername/nariride-safety/blob/main/LICENSE"><img src="https://img.shields.io/github/license/yourusername/nariride-safety?style=for-the-badge&color=blue" alt="License" /></a>
  </p>
</div>

---

## 🌟 The Vision

In a world where safety during travel remains a prominent concern, **NariRide Safety** steps in as the ultimate mobility solution designed with women's security at its core. More than just a ride-sharing app, NariRide is a holistic ecosystem that integrates real-time geospatial tracking, instant SOS alerts, verified driver networks, and a community-driven safety protocol. 

Built specifically for high-stakes environments, NariRide ensures that every journey is monitored, safe, and transparent.

---

## ✨ Hackathon-Winning Features

*   **🗺️ Live Precision Tracking:** Integrated with Leaflet for hyper-accurate, real-time location mapping, route deviation alerts, and live-sharing with emergency contacts.
*   **🚨 Instant SOS System:** One-tap emergency triggers that instantly notify local authorities and registered emergency contacts with exact GPS coordinates.
*   **🔐 Bulletproof Authentication:** Powered by Supabase, featuring multi-factor authentication (MFA) and biometric login for both riders and drivers.
*   **🤖 Smart Driver Verification:** Background checks and continuous identity verification using AI to ensure the person behind the wheel is authorized.
*   **📱 Native Cross-Platform Experience:** Built with Capacitor, delivering a seamless, lightning-fast native app experience on both Android and iOS from a single codebase.
*   **🎨 Stunning UI/UX:** Crafted with Tailwind CSS, Radix UI, and Framer Motion, offering an intuitive, accessible, and visually captivating interface in both light and dark modes.
*   **⚡ Blazing Fast Architecture:** Leveraging TanStack Start, React 19, and Vite for optimal performance, rapid loading times, and offline capabilities.

---

## 🛠️ Cutting-Edge Tech Stack

Our application is built on the shoulders of modern, scalable technologies to ensure high availability and responsiveness.

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 19, TanStack Start |
| **Styling & Animation**| Tailwind CSS, Radix UI, Framer Motion, Lucide React |
| **Mapping & Geospatial**| Leaflet, React-Leaflet |
| **Backend & Database** | Supabase (PostgreSQL), Edge Functions |
| **Mobile Compilation** | Capacitor (Android & iOS native builds) |
| **Build & Tooling** | Vite, TypeScript, ESLint, Prettier |

---

## 🚀 Getting Started

Follow these steps to run NariRide Safety locally for development and testing.

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
*   Android Studio (for Android mobile development)

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/nariride-safety.git
cd nariride-safety

# Install all dependencies
npm install
# or if using bun: bun install
```

### 2. Environment Variables

Create a `.env` file in the root directory and add your Supabase and Map API credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Web App

```bash
# Start the development server
npm run dev
```

Visit `http://localhost:5173` to view the application in your browser.

### 4. Build for Production

```bash
# Create an optimized production build
npm run build
```

### 5. Mobile Development (Android)

To run the app on an Android device or emulator using Capacitor:

```bash
npm run build
npx cap sync android
npx cap open android
```

---

## 🤝 Contributing

We welcome contributions from the open-source community! Together, we can make mobility safer for everyone.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🏆 Hackathon Journey

**NariRide Safety** was conceptualized and built to tackle the critical issue of women's safety during transit. Our focus on **Real-time processing**, **User-centric design**, and **Scalable architecture** makes it a robust solution ready for the real world.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <p>Built with ❤️ for a safer tomorrow.</p>
</div>
