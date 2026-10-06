import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Architecture | FrankenSQLite",
  description:
    "How FrankenSQLite's 28 crates fit together: page-level MVCC with serializable isolation, the WAL and B-tree, and which designs (RaptorQ repair, native mode, merge ladder, encryption) are live versus in progress.",
};

export default function ArchitectureLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
