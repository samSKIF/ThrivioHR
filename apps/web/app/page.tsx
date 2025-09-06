import { redirect } from "next/navigation";

export default async function HomePage() {
  // Always redirect to login page immediately for faster loading
  // Auth check will happen on the login page or after login
  redirect('/login');
}