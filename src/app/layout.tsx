import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthContext";

export const metadata: Metadata = {
  title: "FamTree — Family Tree Generator & Lineage Explorer",
  description:
    "Explore your ancestry, build multi-generational family trees, and discover precise family relationships with FamTree.",
};

const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('famtree-theme');
      var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF9F5] text-stone-900 dark:bg-[#111513] dark:text-stone-100 antialiased selection:bg-emerald-100 selection:text-emerald-900 transition-colors">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
