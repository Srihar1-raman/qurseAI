import type { Metadata, Viewport } from "next";
import { Inter, Reenie_Beanie } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const reenieBeanie = Reenie_Beanie({
  variable: "--font-reenie",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Qurse",
  description: "AI Assistant - A modern AI chat interface",
  icons: {
    icon: [
      { url: '/favicon-dark/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-dark/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-dark/favicon.ico', type: 'image/x-icon' }
    ],
    apple: [
      { url: '/favicon-dark/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash on page load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'auto';
                  var isDark = false;
                  
                  if (theme === 'dark') {
                    isDark = true;
                  } else if (theme === 'auto') {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${reenieBeanie.variable} antialiased`} suppressHydrationWarning>
        <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
              <ToastProvider>
            {children}
                <Toaster />
              </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
