import "./globals.css";

export const metadata = {
  title: "Shivanshcodex Chat",
  description: "WhatsApp-like chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
