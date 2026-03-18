import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/Toast";
import ThemeToggle from "./components/ThemeToggle";
import Navbar from "./components/Navbar";

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
          <Navbar />
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
