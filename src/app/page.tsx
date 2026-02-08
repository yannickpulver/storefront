import { Dashboard } from "@/components/dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Dashboard />
      </div>
    </main>
  );
}
