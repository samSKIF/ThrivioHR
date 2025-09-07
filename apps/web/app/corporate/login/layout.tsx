import "../../globals.css";

export const metadata = {
  title: "Corporate Login - ThrivioHR",
  description: "Corporate admin login",
};

/**
 * Login layout that excludes the corporate header/navigation.
 * Shows only the login form without management interface elements.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {children}
    </div>
  );
}