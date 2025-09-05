import "./globals.css";
import Header from "../components/Header";

export const metadata = {
  title: "ThrivioHR",
  description: "People operations platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="legacy">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}