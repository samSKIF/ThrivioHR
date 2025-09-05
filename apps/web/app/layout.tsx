import "./globals.css";

export const metadata = {
  title: "ThrivioHR",
  description: "People operations platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="legacy">
      <body>
        {children}
      </body>
    </html>
  );
}