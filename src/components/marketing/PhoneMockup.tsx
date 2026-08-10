import { SceneMark } from "@/components/marketing/SceneMark";

// A real recreation of the app's actual Home screen — same copy patterns,
// same card shapes, same accent color — built from markup rather than a
// screenshot image. It's honest (nothing here claims to be a photo of a
// real device) and it can't go stale the way a committed screenshot would
// the next time the app's Home screen changes.
const PROJECTS = [
  { title: "Paper Trail", meta: "Pre-Production · Mystery" },
  { title: "Midnight Static", meta: "Filming · Thriller" },
];

const PEOPLE = ["P", "R", "E", "O"];

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[280px] rounded-[2.5rem] border-[6px] border-[#1C1C21] bg-[#1C1C21] shadow-2xl">
      <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-[#1C1C21]" />
      <div className="h-[560px] overflow-hidden rounded-[2rem] bg-[#F8F8F6] px-4 pb-4 pt-9">
        <div className="mb-4 flex items-center justify-between">
          <SceneMark size={16} color="#191A1C" />
          <div className="h-2 w-2 rounded-full bg-[#8F4637]" />
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6E7378]">
          Good evening
        </p>
        <p className="mb-4 font-serif text-lg font-semibold text-[#191A1C]">Maya</p>

        <p className="mb-2 text-[11px] font-semibold text-[#191A1C]">Continue where you left off</p>
        <div className="mb-4 flex gap-2">
          {PROJECTS.map((project) => (
            <div key={project.title} className="w-24 overflow-hidden rounded-lg border border-[#E5E7EA] bg-white">
              <div className="h-14 bg-[#F1F1EE]" />
              <div className="p-1.5">
                <p className="truncate text-[9px] font-semibold text-[#191A1C]">{project.title}</p>
                <p className="truncate text-[8px] text-[#6E7378]">{project.meta}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mb-2 text-[11px] font-semibold text-[#191A1C]">People you may know</p>
        <div className="mb-4 flex gap-2">
          {PEOPLE.map((initial) => (
            <div
              key={initial}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E5E7EA] text-[10px] font-semibold text-[#6E7378]"
            >
              {initial}
            </div>
          ))}
        </div>

        <p className="mb-2 text-[11px] font-semibold text-[#191A1C]">Trending projects</p>
        <div className="flex gap-2">
          <div className="h-16 flex-1 rounded-lg bg-[#F1F1EE]" />
          <div className="h-16 flex-1 rounded-lg bg-[#F1F1EE]" />
        </div>

        <div className="mt-6 flex items-center justify-around rounded-full bg-white px-2 py-2 shadow-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-[#8F4637]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#B7BABE]" />
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8F4637] text-[10px] text-white">
            +
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-[#B7BABE]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#B7BABE]" />
        </div>
      </div>
    </div>
  );
}
