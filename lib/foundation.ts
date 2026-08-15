export type FoundationArea = {
  title: string;
  description: string;
  icon: "app" | "data" | "safety" | "quality";
  items: string[];
};

export function getFoundationAreas(): FoundationArea[] {
  return [
    {
      title: "Application structure",
      description: "A single Next.js App Router application with clear shared boundaries.",
      icon: "app",
      items: [
        "App Router with a minimal home screen, error boundary, and not-found route.",
        "Shared component and utility folders aligned with the project docs.",
        "No authentication, profile, skill, doubt, messaging, or admin flows yet.",
      ],
    },
    {
      title: "Data foundation",
      description: "Local database access through Prisma and SQLite only.",
      icon: "data",
      items: [
        "Prisma client lives in a dedicated server-only module.",
        "SQLite is configured through DATABASE_URL in the environment.",
        "A health route verifies basic database connectivity without adding product APIs.",
      ],
    },
    {
      title: "Safety defaults",
      description: "Early guardrails for predictable local development.",
      icon: "safety",
      items: [
        "Environment variables are validated with Zod before Prisma initializes.",
        "An error boundary provides a reusable recovery pattern for future routes.",
        "Server-only modules keep database and environment logic off the client.",
      ],
    },
    {
      title: "Quality checks",
      description: "Baseline commands for verification before later feature work.",
      icon: "quality",
      items: [
        "Vitest is configured for a simple unit-testing foundation.",
        "ESLint, TypeScript, and Next.js build commands are documented and scripted.",
        "Prisma migration and reset commands are available for local database workflows.",
      ],
    },
  ];
}
