// This layout intentionally doesn't import the parent corporate layout styles
import "../../globals.css";

export const metadata = {
  title: "Corporate Login - ThrivioHR",
  description: "Corporate admin login",
};

/**
 * Simple layout - the corporate layout will handle bypassing header/nav for login page.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}