import "./globals.css";

export const metadata = { title: "Shivanshcodex" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-live">{children}</body>
    </html>
  );
}
