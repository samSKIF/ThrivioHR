import "./globals.css";
import HydrationErrorBoundary from "../components/HydrationErrorBoundary";

export const metadata = {
  title: "ThrivioHR",
  description: "People operations platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <HydrationErrorBoundary>
          {children}
        </HydrationErrorBoundary>
      </body>
    </html>
  );
}