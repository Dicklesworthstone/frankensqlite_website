import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Architecture | FrankenSQLite",
  description:
    "Deep dive into FrankenSQLite's 26-crate layered workspace, from B-tree storage to MVCC concurrency and RaptorQ self-healing.",
};

export default function ArchitectureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
