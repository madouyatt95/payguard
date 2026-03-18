import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import ThemeToggle from "./components/ThemeToggle";
import AuthNav from "./components/AuthNav";

export const metadata: Metadata = {
  title: "PayGuard — Vérification de Bulletins de Paie",
  description: "Outil d'aide à la lecture et à la détection d'anomalies sur les bulletins de paie français. PayGuard analyse, explique et recommande. Il ne remplace pas un professionnel de la paie.",
  keywords: ["bulletin de paie", "fiche de paie", "vérification", "anomalie", "paie", "France"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PayGuard",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="dark">
      <body>
        <ToastProvider>
          <nav className="navbar">
            <div className="navbar-inner">
              <a href="/" className="navbar-brand">
                <span className="shield">🛡️</span>
                PayGuard
              </a>
              <ul className="navbar-links">
                <li><a href="/dashboard">Tableau de bord</a></li>
                <li><a href="/upload">Analyser</a></li>
                <li><a href="/profiles">Profils</a></li>
                <li><a href="/comparison">Comparaison</a></li>
                <li><a href="/pricing">Tarifs</a></li>
                <li><a href="/help">Aide</a></li>
                <li><ThemeToggle /></li>
                <li><AuthNav /></li>
              </ul>
            </div>
          </nav>
          {children}
          <footer className="footer">
            <div className="container">
              <div className="footer-caution">
                ⚠️ PayGuard est un outil d&apos;aide à la lecture. Il ne constitue en aucun cas un conseil juridique, comptable ou un avis professionnel sur la paie. En cas de doute, consultez un professionnel qualifié.
              </div>
              <p>© {new Date().getFullYear()} PayGuard — Outil d&apos;aide à la lecture de bulletins de paie français</p>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
