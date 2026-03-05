import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accoglienze",
  description: "Tally -> Supabase -> User portal",
};

const APP_LAST_UPDATE_DATE = "05/03/2026";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame">
          <div className="app-content">{children}</div>
          <footer className="app-footer">
            <span>Ultimo aggiornamento: {APP_LAST_UPDATE_DATE}</span>
            <span>Per supporto: accoglienzesantegidio@gmail.com</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
