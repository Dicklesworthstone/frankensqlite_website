import { ArrowLeft, Database } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-teal-500/20 bg-teal-500/5">
        <Database className="h-10 w-10 text-teal-500" />
      </div>
      <h1 className="mb-2 font-mono text-6xl font-bold text-gradient-franken">404</h1>
      <p className="mb-1 text-xl font-semibold text-white/90">Page not found</p>
      <p className="mb-8 max-w-md text-white/50">
        The query returned an empty result set. This page doesn&apos;t exist or has been dropped.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-6 py-3 font-medium text-black transition-all hover:bg-teal-400 hover:shadow-lg hover:shadow-teal-500/20"
      >
        <ArrowLeft size={18} />
        Back to Home
      </Link>
    </main>
  );
}
