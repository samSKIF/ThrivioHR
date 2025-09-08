import { redirect } from "next/navigation";

export default async function HomePage() {
  // Always send logged-in users to the feed. The login page will handle unauthenticated users.
  redirect("/feed");
}