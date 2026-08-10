import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProjectForm } from "@/components/ProjectForm";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold">New project</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Add a project to start building its verified filmography.
        </p>
      </div>
      <ProjectForm />
    </div>
  );
}
