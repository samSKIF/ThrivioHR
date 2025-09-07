// This layout intentionally doesn't import the parent corporate layout styles
import "../../globals.css";

export const metadata = {
  title: "Corporate Login - ThrivioHR",
  description: "Corporate admin login",
};

/**
 * Empty layout to bypass the corporate header/navigation completely.
 * We'll handle the full page styling in the page component itself.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  // Return just the children without any wrapper - this bypasses the corporate layout
  return <>{children}</>;
}