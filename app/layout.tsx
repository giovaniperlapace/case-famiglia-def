import type { Metadata } from "next";
import "./globals.css";
import { APP_LAST_UPDATE_ISO } from "@/lib/app/build-info";

export const metadata: Metadata = {
  title: "Accoglienze",
  description: "Tally -> Supabase -> User portal",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "n/d";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "n/d";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lastUpdateDate = formatDate(APP_LAST_UPDATE_ISO);

  return (
    <html lang="en">
      <body>
        <div className="app-frame">
          <div className="app-content">{children}</div>
          <footer className="app-footer">
            <span>Ultimo aggiornamento: {lastUpdateDate}</span>
            <span>Per supporto: accoglienzesantegidio@gmail.com</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
