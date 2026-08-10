import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function MyProfileRedirectPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect(`/profile/${user.id}`);
}
