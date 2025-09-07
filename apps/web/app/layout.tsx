import "./globals.css";
import HydrationErrorBoundary from "../components/HydrationErrorBoundary";
import ClientOnlyWrapper from "../components/ClientOnlyWrapper";

export const metadata = {
  title: "ThrivioHR",
  description: "People operations platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <HydrationErrorBoundary>
          <ClientOnlyWrapper
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            {children}
          </ClientOnlyWrapper>
        </HydrationErrorBoundary>
      </body>
    </html>
  );
}