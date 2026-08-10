import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { FilmRole, ProjectStatus } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "slate-demo-2026";

const CITIES = {
  LA: { city: "Los Angeles", state: "CA", latitude: 34.0522, longitude: -118.2437 },
  SF: { city: "San Francisco", state: "CA", latitude: 37.7749, longitude: -122.4194 },
  NYC: { city: "New York", state: "NY", latitude: 40.7128, longitude: -74.006 },
  ATX: { city: "Austin", state: "TX", latitude: 30.2672, longitude: -97.7431 },
} as const;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  const alreadySeeded = await prisma.user.findUnique({
    where: { email: "maya.okafor@slate.dev" },
  });
  if (alreadySeeded) {
    console.log("Seed data already present. Skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const userDefs = [
    { key: "maya", name: "Maya Okafor", email: "maya.okafor@slate.dev", ...CITIES.LA, roles: ["DIRECTOR"], level: "PROFESSIONAL", bio: "Narrative director focused on character-driven thrillers.", tagline: null },
    { key: "theo", name: "Theo Marsh", email: "theo.marsh@slate.dev", ...CITIES.LA, roles: ["DIRECTOR_OF_PHOTOGRAPHY"], level: "INDIE", bio: "Cinematographer shooting mostly on 16mm.", tagline: "Director | Seeking Sound Mixer" },
    { key: "priya", name: "Priya Chandra", email: "priya.chandra@slate.dev", ...CITIES.LA, roles: ["EDITOR"], level: "PROFESSIONAL", bio: "Editor specializing in tight, dialogue-driven cuts.", tagline: null },
    { key: "sam", name: "Sam Ortiz", email: "sam.ortiz@slate.dev", ...CITIES.LA, roles: ["SOUND_ENGINEER"], level: "STUDENT", bio: "Film student building a sound design reel.", tagline: null },
    { key: "nia", name: "Nia Brooks", email: "nia.brooks@slate.dev", ...CITIES.LA, roles: ["PRODUCER"], level: "VETERAN", bio: "Line producer with 15 years on indie features.", tagline: "Line Producer | 15 years indie features" },
    { key: "ethan", name: "Ethan Wu", email: "ethan.wu@slate.dev", ...CITIES.SF, roles: ["DIRECTOR"], level: "INDIE", bio: "Documentary and narrative hybrid director.", tagline: null },
    { key: "ravi", name: "Ravi Patel", email: "ravi.patel@slate.dev", ...CITIES.SF, roles: ["COLORIST"], level: "PROFESSIONAL", bio: "Colorist for indie features and commercials.", tagline: null },
    { key: "lena", name: "Lena Fischer", email: "lena.fischer@slate.dev", ...CITIES.SF, roles: ["GAFFER", "PRODUCER"], level: "STUDENT", bio: "Gaffer and aspiring producer, Bay Area based.", tagline: "Gaffer with RED Package" },
    { key: "marcus", name: "Marcus Bell", email: "marcus.bell@slate.dev", ...CITIES.NYC, roles: ["SCREENWRITER"], level: "PROFESSIONAL", bio: "Screenwriter with a focus on urban dramas.", tagline: null },
    { key: "yuki", name: "Yuki Tanaka", email: "yuki.tanaka@slate.dev", ...CITIES.NYC, roles: ["FIRST_AC"], level: "INDIE", bio: "1st AC working across features and commercials.", tagline: null },
    { key: "isabella", name: "Isabella Rossi", email: "isabella.rossi@slate.dev", ...CITIES.NYC, roles: ["ACTOR"], level: "VETERAN", bio: "Stage and screen actor, NYC based.", tagline: null },
    { key: "cole", name: "Cole Bennett", email: "cole.bennett@slate.dev", ...CITIES.ATX, roles: ["PRODUCTION_DESIGNER"], level: "INDIE", bio: "Production designer for sci-fi and genre films.", tagline: null },
    { key: "harper", name: "Harper Diaz", email: "harper.diaz@slate.dev", ...CITIES.ATX, roles: ["VFX_ARTIST"], level: "STUDENT", bio: "VFX artist building an indie reel.", tagline: null },
    { key: "owen", name: "Owen Frost", email: "owen.frost@slate.dev", ...CITIES.ATX, roles: ["COMPOSER"], level: "PROFESSIONAL", bio: "Composer scoring indie features and shorts.", tagline: null },
  ] as const;

  const users: Record<string, { id: string }> = {};
  for (const u of userDefs) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        username: u.key,
        tagline: u.tagline,
        passwordHash,
        city: u.city,
        state: u.state,
        latitude: u.latitude,
        longitude: u.longitude,
        primaryRoles: [...u.roles],
        experienceLevel: u.level,
        bio: u.bio,
        portfolioLinks: {
          create: [{ label: "Reel", url: `https://vimeo.com/${u.key}reel` }],
        },
      },
    });
    users[u.key] = user;
  }

  async function makeProject(opts: {
    title: string;
    genre: string;
    status: ProjectStatus;
    releaseYear?: number;
    logline: string;
    location: (typeof CITIES)[keyof typeof CITIES];
    ownerKey: string;
    credits: { userKey: string; role: FilmRole; verified: boolean }[];
  }) {
    return prisma.project.create({
      data: {
        title: opts.title,
        genre: opts.genre,
        status: opts.status,
        releaseYear: opts.releaseYear,
        logline: opts.logline,
        city: opts.location.city,
        state: opts.location.state,
        latitude: opts.location.latitude,
        longitude: opts.location.longitude,
        ownerId: users[opts.ownerKey].id,
        credits: {
          create: opts.credits.map((c) => ({
            userId: users[c.userKey].id,
            role: c.role,
            isVerified: c.verified,
            verifiedById: c.verified ? users[opts.ownerKey].id : null,
            verifiedAt: c.verified ? new Date() : null,
          })),
        },
      },
    });
  }

  const midnightStatic = await makeProject({
    title: "Midnight Static",
    genre: "Thriller",
    status: "FILMING",
    logline: "A late-night radio host uncovers a conspiracy live on air.",
    location: CITIES.LA,
    ownerKey: "maya",
    credits: [
      { userKey: "maya", role: "DIRECTOR", verified: true },
      { userKey: "theo", role: "DIRECTOR_OF_PHOTOGRAPHY", verified: true },
      { userKey: "priya", role: "EDITOR", verified: true },
      { userKey: "sam", role: "SOUND_ENGINEER", verified: false },
    ],
  });

  const paperSkies = await makeProject({
    title: "Paper Skies",
    genre: "Drama",
    status: "PRE_PRODUCTION",
    logline: "Two estranged sisters rebuild a family paper mill.",
    location: CITIES.LA,
    ownerKey: "theo",
    credits: [
      { userKey: "theo", role: "DIRECTOR_OF_PHOTOGRAPHY", verified: true },
      { userKey: "nia", role: "PRODUCER", verified: true },
      { userKey: "priya", role: "EDITOR", verified: true },
    ],
  });

  const concreteGarden = await makeProject({
    title: "Concrete Garden",
    genre: "Drama",
    status: "POST_PRODUCTION",
    logline: "A community garden becomes the last holdout against redevelopment.",
    location: CITIES.SF,
    ownerKey: "ethan",
    credits: [
      { userKey: "ethan", role: "DIRECTOR", verified: true },
      { userKey: "ravi", role: "COLORIST", verified: true },
      { userKey: "lena", role: "GAFFER", verified: true },
    ],
  });

  const harborLines = await makeProject({
    title: "Harbor Lines",
    genre: "Documentary",
    status: "FILMING",
    logline: "Following three fishing families through a changing bay.",
    location: CITIES.SF,
    ownerKey: "lena",
    credits: [
      { userKey: "lena", role: "PRODUCER", verified: true },
      { userKey: "ethan", role: "DIRECTOR", verified: true },
    ],
  });

  const theLongWire = await makeProject({
    title: "The Long Wire",
    genre: "Drama",
    status: "COMPLETED",
    releaseYear: 2025,
    logline: "A telecom lineman becomes an unlikely witness to a city changing.",
    location: CITIES.NYC,
    ownerKey: "marcus",
    credits: [
      { userKey: "marcus", role: "SCREENWRITER", verified: true },
      { userKey: "yuki", role: "FIRST_AC", verified: true },
      { userKey: "isabella", role: "ACTOR", verified: true },
    ],
  });

  const riverside = await makeProject({
    title: "Riverside",
    genre: "Drama",
    status: "FILMING",
    logline: "A retired boxer trains one last fighter on the riverbank.",
    location: CITIES.NYC,
    ownerKey: "isabella",
    credits: [
      { userKey: "isabella", role: "ACTOR", verified: true },
      { userKey: "marcus", role: "SCREENWRITER", verified: true },
      { userKey: "yuki", role: "FIRST_AC", verified: false },
    ],
  });

  const staticBloom = await makeProject({
    title: "Static Bloom",
    genre: "Sci-Fi",
    status: "PRE_PRODUCTION",
    logline: "A botanist discovers a signal hidden in plant growth patterns.",
    location: CITIES.ATX,
    ownerKey: "cole",
    credits: [
      { userKey: "cole", role: "PRODUCTION_DESIGNER", verified: true },
      { userKey: "harper", role: "VFX_ARTIST", verified: true },
      { userKey: "owen", role: "COMPOSER", verified: true },
    ],
  });

  await prisma.productionRequest.createMany({
    data: [
      {
        title: "Need a PA for night shoot",
        projectId: midnightStatic.id,
        postedById: users.maya.id,
        roleNeeded: "PRODUCTION_ASSISTANT",
        compensationType: "PAID",
        city: CITIES.LA.city,
        state: CITIES.LA.state,
        latitude: CITIES.LA.latitude,
        longitude: CITIES.LA.longitude,
        isFilled: false,
      },
      {
        title: "Looking for a costume designer",
        projectId: paperSkies.id,
        postedById: users.theo.id,
        roleNeeded: "COSTUME_DESIGNER",
        compensationType: "CREDIT_COPY",
        city: CITIES.LA.city,
        state: CITIES.LA.state,
        latitude: CITIES.LA.latitude,
        longitude: CITIES.LA.longitude,
        isFilled: false,
      },
      {
        title: "Need a key grip for a 3-day shoot",
        projectId: concreteGarden.id,
        postedById: users.ethan.id,
        roleNeeded: "KEY_GRIP",
        compensationType: "PAID",
        city: CITIES.SF.city,
        state: CITIES.SF.state,
        latitude: CITIES.SF.latitude,
        longitude: CITIES.SF.longitude,
        isFilled: false,
      },
      {
        title: "Seeking a 2nd AC",
        projectId: harborLines.id,
        postedById: users.lena.id,
        roleNeeded: "SECOND_AC",
        compensationType: "DEFERRED",
        city: CITIES.SF.city,
        state: CITIES.SF.state,
        latitude: CITIES.SF.latitude,
        longitude: CITIES.SF.longitude,
        isFilled: true,
      },
      {
        title: "Need a casting director",
        projectId: riverside.id,
        postedById: users.isabella.id,
        roleNeeded: "CASTING_DIRECTOR",
        compensationType: "CREDIT_COPY",
        city: CITIES.NYC.city,
        state: CITIES.NYC.state,
        latitude: CITIES.NYC.latitude,
        longitude: CITIES.NYC.longitude,
        isFilled: false,
      },
      {
        title: "Need a line producer",
        projectId: staticBloom.id,
        postedById: users.cole.id,
        roleNeeded: "LINE_PRODUCER",
        compensationType: "PAID",
        city: CITIES.ATX.city,
        state: CITIES.ATX.state,
        latitude: CITIES.ATX.latitude,
        longitude: CITIES.ATX.longitude,
        isFilled: false,
      },
    ],
  });

  const laShorts = await prisma.festival.create({
    data: {
      name: "LA Shorts Showcase",
      city: CITIES.LA.city,
      state: CITIES.LA.state,
      latitude: CITIES.LA.latitude,
      longitude: CITIES.LA.longitude,
      startDate: daysFromNow(5),
      endDate: daysFromNow(7),
      description: "A showcase of independent shorts from across LA.",
      featuredFilms: { create: [{ projectId: midnightStatic.id }] },
      attendees: {
        create: [{ userId: users.maya.id }, { userId: users.theo.id }, { userId: users.priya.id }],
      },
    },
  });

  const bayAreaFest = await prisma.festival.create({
    data: {
      name: "Bay Area Film Fest",
      city: CITIES.SF.city,
      state: CITIES.SF.state,
      latitude: CITIES.SF.latitude,
      longitude: CITIES.SF.longitude,
      startDate: daysFromNow(20),
      endDate: daysFromNow(23),
      description: "Celebrating independent film from the Bay Area.",
      featuredFilms: { create: [{ projectId: concreteGarden.id }] },
      attendees: { create: [{ userId: users.ethan.id }, { userId: users.ravi.id }] },
    },
  });

  await prisma.festival.create({
    data: {
      name: "Austin Indie Fest",
      city: CITIES.ATX.city,
      state: CITIES.ATX.state,
      latitude: CITIES.ATX.latitude,
      longitude: CITIES.ATX.longitude,
      startDate: daysFromNow(3),
      endDate: daysFromNow(4),
      description: "Genre and indie film from Austin and beyond.",
      featuredFilms: { create: [{ projectId: staticBloom.id }] },
      attendees: {
        create: [{ userId: users.cole.id }, { userId: users.harper.id }, { userId: users.owen.id }],
      },
    },
  });

  await prisma.festival.create({
    data: {
      name: "NYC Winter Shorts",
      city: CITIES.NYC.city,
      state: CITIES.NYC.state,
      latitude: CITIES.NYC.latitude,
      longitude: CITIES.NYC.longitude,
      startDate: daysFromNow(-10),
      endDate: daysFromNow(-8),
      description: "A cold-weather showcase of NYC short films.",
      featuredFilms: { create: [{ projectId: theLongWire.id }, { projectId: riverside.id }] },
      attendees: {
        create: [{ userId: users.marcus.id }, { userId: users.isabella.id }, { userId: users.yuki.id }],
      },
    },
  });

  await prisma.connection.createMany({
    data: [
      {
        requesterId: users.maya.id,
        receiverId: users.theo.id,
        status: "ACCEPTED",
        note: "Great DP, want to work together again.",
        festivalId: laShorts.id,
      },
      {
        requesterId: users.ethan.id,
        receiverId: users.ravi.id,
        status: "ACCEPTED",
        note: "Met at the color grading panel.",
        festivalId: bayAreaFest.id,
      },
    ],
  });

  await prisma.feedPost.createMany({
    data: [
      {
        authorId: users.maya.id,
        projectId: midnightStatic.id,
        kind: "production_launch",
        headline: "Midnight Static is officially rolling",
        body: "First night of principal photography down. The radio station set came together better than we hoped — huge thanks to the crew for the late call time.",
      },
      {
        authorId: users.theo.id,
        projectId: paperSkies.id,
        kind: "poster_reveal",
        headline: "First look at the Paper Skies poster",
        body: "Nia and I have been sitting on this one for weeks. Pre-production kicks into high gear next month.",
        seekingFeedback: true,
      },
      {
        authorId: users.ethan.id,
        projectId: concreteGarden.id,
        kind: "wrap",
        headline: "Concrete Garden has wrapped",
        body: "That's a wrap on principal photography. Into the color suite with Ravi next — can't wait to show you what we shot.",
      },
      {
        authorId: users.lena.id,
        projectId: harborLines.id,
        kind: "production_launch",
        headline: "Harbor Lines cameras are rolling",
        body: "Spent the morning on the docks with our first family. This story deserves to be told right.",
      },
      {
        authorId: users.marcus.id,
        projectId: theLongWire.id,
        kind: "award",
        headline: "The Long Wire took Best Drama at NYC Winter Shorts",
        body: "Still processing this one. Grateful to everyone who believed in a script about a telecom lineman.",
      },
      {
        authorId: users.isabella.id,
        projectId: riverside.id,
        kind: "production_launch",
        headline: "Riverside begins filming on the water",
        body: "Boxing choreography rehearsals paid off — day one on the riverbank went smoother than expected.",
      },
      {
        authorId: users.cole.id,
        projectId: staticBloom.id,
        kind: "project_launch",
        headline: "Announcing Static Bloom",
        body: "A sci-fi short about a botanist who finds a signal hidden in plant growth patterns. Assembling the crew now — see the open calls below.",
        seekingFestivalPartner: true,
      },
      {
        authorId: users.priya.id,
        kind: "wrap",
        headline: "Wrapped the Midnight Static assembly cut",
        body: "First pass is in. Trimming 12 minutes out of the radio station sequence alone.",
      },
      {
        authorId: users.harper.id,
        kind: "poster_reveal",
        headline: "Early VFX tests for Static Bloom",
        body: "Playing with signal-visualization looks for the plant growth sequences. More soon.",
        seekingFeedback: true,
      },
      {
        authorId: users.yuki.id,
        kind: "production_launch",
        headline: "Back on set for Riverside",
        body: "Second week of 1st AC duties on the riverbank — the light this time of year is unbeatable.",
      },
    ],
  });

  console.log(`Seeded ${userDefs.length} users, 7 projects, 6 crew requests, 4 festivals, 10 feed posts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
