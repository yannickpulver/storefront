import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import packageJson from "../../package.json";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Dashboard userEmail={session.user.email ?? ""} />
      </div>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Built by{" "}
        <a
          href="https://yannickpulver.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Yannick Pulver
        </a>
        {" · "}v{packageJson.version}
      </footer>
    </main>
  );
}
