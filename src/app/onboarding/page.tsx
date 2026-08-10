import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold">Set up your profile</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Tell other filmmakers what you do and where you&apos;re based.
        </p>
      </div>
      <OnboardingForm userId={user.id} />
    </div>
  );
}
