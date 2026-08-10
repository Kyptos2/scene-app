import { CollaborateIcon, ConnectIcon, LoopIcon, ShowcaseIcon } from "@/components/marketing/icons";

const ITEMS = [
  { Icon: ConnectIcon, title: "Connect", body: "Find and connect with filmmakers worldwide." },
  { Icon: CollaborateIcon, title: "Collaborate", body: "Work on projects and build your professional network." },
  { Icon: ShowcaseIcon, title: "Showcase", body: "Share your work and get discovered." },
  { Icon: LoopIcon, title: "Stay in the loop", body: "Never miss opportunities, festivals, or open calls." },
] as const;

export function FeatureIconRow() {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map(({ Icon, title, body }) => (
        <div key={title}>
          <Icon className="text-tint" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-foreground/70">{body}</p>
        </div>
      ))}
    </div>
  );
}
