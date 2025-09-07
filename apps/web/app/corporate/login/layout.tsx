// This layout intentionally doesn't import the parent corporate layout styles
import "../../globals.css";

export const metadata = {
  title: "Corporate Login - ThrivioHR",
  description: "Corporate admin login",
};

/**
 * Complete standalone layout to bypass the corporate header/navigation completely.
 * This creates a full HTML structure that ignores the parent corporate layout.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}