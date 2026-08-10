import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FestivalForm } from "@/components/FestivalForm";

export default async function NewFestivalPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold">New festival</h1>
        <p className="mt-1 text-sm text-neutral-600">
          List a festival so nearby filmmakers can discover it and enter their projects.
        </p>
      </div>
      <FestivalForm />
    </div>
  );
}
