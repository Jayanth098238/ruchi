import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Equity Research AI",
  description: "AI-powered equity research and analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme early to avoid FOUC in static output */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const path = window.location.pathname;
                const isLanding = path === '/' || path === '' || path === '/index';
                if (isLanding) {
                  // Landing page stays light
                  document.documentElement.classList.remove('dark');
                  try { localStorage.setItem('theme', 'light'); } catch {}
                  return;
                }
                // All other routes: force dark
                document.documentElement.classList.add('dark');
                try { localStorage.setItem('theme', 'dark'); } catch {}
              } catch {}
            })();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
