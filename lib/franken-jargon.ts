export interface JargonTerm {
  term: string;
  short: string;
  long: string;
  analogy?: string;
  why?: string;
  related?: string[];
}

// Glossary popovers used across the site. Definitions should describe the
// technique accurately and, where FrankenSQLite is mentioned, match the
// engine's current status (see engineSnapshot in lib/site-config.ts).
export const jargonDictionary: Record<string, JargonTerm> = {
  mvcc: {
    term: "MVCC (Multi-Version Concurrency Control)",
    short:
      "Keeping several versions of data around so readers and writers don't have to wait for each other.",
    long: "Instead of locking data while it changes, a writer creates a new version. Readers keep using the version that was current when they started; the new version becomes visible to transactions that start after the writer commits. FrankenSQLite versions whole pages, because pages are SQLite's unit of storage. Writers on different pages can work at the same time; two writers on the same page conflict, and one retries.",
    analogy:
      "Like editing your own copy of a shared document while everyone else keeps reading the last published version.",
    why: "SQLite allows one writer at a time. Page-level MVCC is how FrankenSQLite lets several connections write at once without changing the file format.",
    related: ["snapshot-isolation", "fcw", "ssi"],
  },
  "snapshot-isolation": {
    term: "Snapshot Isolation",
    short: "Each transaction sees the database as it was when the transaction started.",
    long: "A transaction gets a snapshot, in effect the newest commit it is allowed to see, and ignores anything committed after that. That rules out dirty reads and non-repeatable reads. On its own it still allows an anomaly called write skew, which is why FrankenSQLite adds SSI on top by default.",
    analogy:
      "Taking a photo of a busy street. The people in your photo stay where they were, whatever they do after the shutter clicks.",
    related: ["mvcc", "ssi"],
  },
  fcw: {
    term: "First-Committer-Wins (FCW)",
    short: "When two transactions change the same page, the one that commits first wins.",
    long: "At commit, FrankenSQLite checks whether any page the transaction wrote has a newer committed version than the one it started from. If so, the transaction lost the race and fails with SQLITE_BUSY_SNAPSHOT. The caller retries it against the new state.",
    analogy:
      "Two people buying the last concert ticket. Whoever checks out first gets it; the other has to start over.",
    related: ["mvcc", "ssi"],
  },
  ssi: {
    term: "Serializable Snapshot Isolation (SSI)",
    short:
      "Snapshot isolation plus a commit-time check that rules out write skew, giving full serializability.",
    long: "SSI tracks which transactions read data that other concurrent transactions wrote. When a transaction would sit in the middle of two such read-write dependencies, the pattern that can produce a non-serializable result, it is aborted. PostgreSQL does this per row. FrankenSQLite does it per page, which is more conservative (it can abort transactions that were actually fine) but keeps the bookkeeping small. It is on by default; PRAGMA fsqlite.serializable = OFF turns it off.",
    analogy:
      "Two on-call doctors each check that the other is on duty, then both sign off. Each decision was fine alone; together they leave nobody on call. SSI notices that pattern and stops one of them.",
    why: "It gives the same guarantee as running transactions one at a time, while still letting them overlap.",
    related: ["fcw", "snapshot-isolation", "cahill-fekete"],
  },
  raptorq: {
    term: "RaptorQ (RFC 6330)",
    short:
      "A fountain code: turns data into symbols such that almost any K of them rebuild the original.",
    long: "RaptorQ splits a block into K source symbols and can generate an unlimited stream of repair symbols. Receiving any K symbols, plus a small margin, recovers the block with very high probability. FrankenSQLite has RaptorQ codecs in the workspace and can write repair symbols for the WAL into a -wal-fec sidecar. Using them automatically during recovery is not wired up yet.",
    analogy:
      "Like filling a glass from a fountain: it doesn't matter which drops you catch, only how many.",
    why: "With enough repair symbols on disk, damaged or missing frames could be rebuilt instead of thrown away.",
    related: ["repair-symbol", "gf256", "wal-fec"],
  },
  gf256: {
    term: "GF(256)",
    short: "The 256-element finite field RaptorQ does its arithmetic in, one element per byte value.",
    long: "In GF(256), addition is XOR and multiplication uses lookup tables, so every operation on a byte stays a byte. Encoding and decoding become systems of linear equations over this field, which a decoder solves to rebuild missing symbols.",
    why: "It makes erasure coding exact: recovery reconstructs the original bytes, not an approximation.",
    related: ["raptorq", "inactivation-decoding"],
  },
  wal: {
    term: "WAL (Write-Ahead Log)",
    short: "An append-only file where changes land before they are copied into the main database.",
    long: "Each changed page is appended as a frame, and the last frame of a transaction marks the commit. Readers check the WAL for newer versions of the pages they need. A checkpoint later copies frames back into the main file. FrankenSQLite uses SQLite's WAL format, so a database can move between the two after a checkpoint (running both on one file at the same time isn't supported).",
    analogy:
      "A doctor's notepad: quick notes during the day, copied into the permanent patient files later.",
    related: ["wal-index", "mvcc"],
  },
  ecs: {
    term: "ECS (Erasure-Coded Stream)",
    short: "The append-only, RaptorQ-encoded storage format planned for FrankenSQLite's native mode.",
    long: "In native mode, durable state would be a stream of immutable objects (commit capsules, markers, page data) stored as RaptorQ symbols and identified by a hash of their contents. A commit exists once its marker is durable. This is design plus partial implementation; today's runtime uses standard SQLite files.",
    why: "It would combine append-only crash safety with built-in repair data in one format.",
    related: ["raptorq", "content-addressed", "systematic-layout"],
  },
  vdbe: {
    term: "VDBE (Virtual Database Engine)",
    short: "The bytecode virtual machine that actually runs your SQL.",
    long: "SQL says what you want, not how to get it. The engine compiles each statement into a small program of opcodes (open a cursor, move to the first row, read a column, emit a result row) and the VDBE executes it. FrankenSQLite follows SQLite's design here and has 190+ opcodes.",
    analogy: "Like a compiler turning source code into instructions a CPU can run.",
    related: ["sql-dialect", "btree"],
  },
  "zero-unsafe": {
    term: "Safe Rust (forbid unsafe)",
    short: "Rust's compile-time memory safety, with unsafe code banned in all but two crates.",
    long: "Rust lets code opt out of its safety checks with the unsafe keyword. FrankenSQLite's workspace sets unsafe_code = \"forbid\" for every crate. Two override it: fsqlite-vfs, for memory-mapped files and shared memory, and the optional fsqlite-c-api, for the C FFI boundary. The parser, planner, VDBE, B-tree, pager, WAL and MVCC code are safe Rust.",
    why: "Buffer overflows, use-after-free and data races can't happen in safe Rust, which covers nearly all of the engine.",
    related: ["newtype-pattern"],
  },
  "witness-plane": {
    term: "Witness Plane",
    short: "The engine's record of which transactions read and wrote which pages, used for SSI.",
    long: "To check serializability, the engine needs evidence: who read what, and who later wrote it. FrankenSQLite calls that evidence the witness plane. The live SSI check uses page-level read and write records to find dangerous read-write dependencies at commit. A fuller version (published witness objects, finer-grained keys, cross-process sharing) is part of the native-mode design.",
    analogy:
      "A visitor log: it doesn't stop anyone entering a room, but it lets you work out afterwards who could have seen what.",
    related: ["ssi", "rw-antidependency"],
  },
  "safe-merge-ladder": {
    term: "Safe Merge Ladder",
    short:
      "A planned way to let two transactions that touched the same page both commit, when that's provably safe.",
    long: "The design has three rungs. First, replay the losing transaction's B-tree-level intent log against the winner's page. Second, if the two changed different cells, merge those cell changes and re-check the page. Third, abort and retry. Merging raw byte ranges is deliberately excluded because it can silently lose updates. The code exists and is tested, but the live commit path doesn't use it yet: today every same-page conflict aborts and retries.",
    why: "Page-level MVCC makes unrelated rows on the same page conflict. The ladder is meant to recover most of those false conflicts.",
    related: ["deterministic-rebase", "fcw"],
  },
  foata: {
    term: "Foata Normal Form",
    short: "A canonical way to write down a concurrent history, grouping steps that could run in any order.",
    long: "Named after Dominique Foata. Given which operations commute, a history can be rewritten as a sequence of layers, each layer a set of mutually independent operations. Two histories with the same Foata form are equivalent. FrankenSQLite's MVCC crate uses this to compress and compare histories in testing; it is not a step in the commit path.",
    related: ["mazurkiewicz-trace", "dpor"],
  },
  "xor-delta": {
    term: "XOR Delta",
    short: "Storing the difference between two page versions as their byte-wise XOR.",
    long: "XOR an old page with a new one and every unchanged byte becomes zero, which compresses well. Keeping deltas instead of full copies can make version chains much smaller when writes change only a few bytes. FrankenSQLite has an implementation in its MVCC crate that the default runtime doesn't use. Note that this is about storing versions; merging two writers' changes by XOR is unsafe and the design forbids it.",
    related: ["mvcc", "safe-merge-ladder"],
  },
  "wal-fec": {
    term: "WAL-FEC",
    short: "Forward error correction for the write-ahead log, stored in a -wal-fec sidecar.",
    long: "After WAL data is synced, FrankenSQLite can encode durable WAL ranges with RaptorQ and write the repair symbols to a separate sidecar file. PRAGMA raptorq_repair_symbols sets how many (default 2). On Unix, an explicit repair_and_open call can use them to rebuild damaged frames. Ordinary recovery doesn't consult them yet.",
    related: ["wal", "raptorq", "repair-symbol"],
  },
  "content-addressed": {
    term: "Content-Addressed Storage",
    short: "Naming each object by a hash of its contents.",
    long: "In the native-mode design, every object gets a 128-bit ID derived from a BLAKE3 hash of its header and payload. The same content always gets the same ID, and any change to the content changes the ID, which makes corruption and tampering easy to detect.",
    analogy: "Like Git, where every commit and file is identified by a hash of what it contains.",
    related: ["ecs"],
  },
  "repair-symbol": {
    term: "Repair Symbol",
    short: "Extra data generated by RaptorQ that can stand in for any lost piece of the original.",
    long: "Given K source symbols, RaptorQ can generate as many repair symbols as you want. Any K symbols (source or repair), plus a small margin, are enough to reconstruct the original. More repair symbols means more losses can be absorbed, at the cost of more storage.",
    related: ["raptorq", "wal-fec"],
  },
  "rw-antidependency": {
    term: "Read-Write Antidependency",
    short: "T1 read something that T2, running concurrently, then overwrote.",
    long: "If T1 reads a page and a concurrent T2 later writes it, T1 must logically come before T2 in any serial order. One such edge is harmless. A transaction with an incoming edge and an outgoing edge is a possible pivot of a cycle, and SSI aborts it.",
    related: ["ssi", "cahill-fekete"],
  },
  "newtype-pattern": {
    term: "Newtype Pattern",
    short: "Wrapping a raw integer in its own type so the compiler won't let you mix it up with another.",
    long: "FrankenSQLite has distinct types for page numbers, page sizes, transaction IDs, commit sequence numbers and more. A function that wants a PageNumber won't accept a TxnId, and a PageSize that isn't a power of two between 512 and 65536 can't be constructed. The wrappers cost nothing at runtime.",
    why: "It turns a whole class of easy-to-make, hard-to-find bugs into compile errors.",
  },
  "time-travel": {
    term: "Time-Travel Query",
    short: "Reading a table as it was at an earlier commit, with FOR SYSTEM_TIME AS OF.",
    long: "SELECT ... FOR SYSTEM_TIME AS OF COMMITSEQ n (or a timestamp) runs the query against the database as it was after that commit. Today this works only for :memory: databases, which keep up to 256 snapshots taken at commit. File-backed databases return an explicit error; persistent history is designed but not built.",
    related: ["mvcc", "snapshot-isolation"],
  },
  btree: {
    term: "B-tree",
    short: "The sorted, balanced tree of pages that every SQLite table and index is stored in.",
    long: "Each table and index is a B-tree of fixed-size pages (4 KB by default). Interior pages hold keys and child pointers; leaf pages hold the rows or index entries. A lookup walks from the root to a leaf, usually three or four pages deep. FrankenSQLite uses SQLite's exact on-disk layout.",
    related: ["vdbe", "mvcc"],
  },
  "sql-dialect": {
    term: "SQLite's SQL",
    short: "The SQL that SQLite speaks, which FrankenSQLite aims to match behavior for behavior.",
    long: "FrankenSQLite's hand-written parser and VDBE cover joins, subqueries, CTEs, window functions, triggers, views, UPSERT and RETURNING, and results are compared against C SQLite 3.52 in the test harness. Parser coverage is ahead of execution parity, and a few query shapes still run through a slower compatibility path.",
    related: ["vdbe"],
  },
  "systematic-layout": {
    term: "Systematic Code",
    short: "An erasure code where the original data is stored unchanged, with repair data alongside.",
    long: "RaptorQ is systematic: the first K encoded symbols are the source symbols themselves. Reading data needs no decoding at all. Repair symbols are only touched when something is missing or damaged.",
    why: "You get the protection of erasure coding without paying for it on every read.",
    related: ["raptorq", "repair-symbol"],
  },
  bocpd: {
    term: "BOCPD (Bayesian Online Change-Point Detection)",
    short: "A streaming algorithm that notices when a time series changes behavior.",
    long: "BOCPD keeps a probability distribution over how long the current regime has lasted. When new observations stop fitting, probability mass shifts to a short run length, signalling a change point. FrankenSQLite has an implementation that the test harness uses as an advisory signal about workload shifts; it doesn't tune the engine or gate correctness.",
    analogy:
      "A thermostat that doesn't just read the temperature but notices when the season has changed.",
  },
  "sheaf-theoretic": {
    term: "Sheaf-Style Consistency Check",
    short: "Checking that many local views can be glued into one consistent global state.",
    long: "Pairwise checks can miss anomalies where every pair of transactions looks fine but no single database state explains all of them. Treating each transaction's view as a local section and asking whether the sections glue together catches that class. In FrankenSQLite this is a model-level test in the MVCC crate, not part of the running database.",
  },
  varint: {
    term: "Varint",
    short: "SQLite's variable-length integer encoding: 1 byte for small numbers, up to 9 for big ones.",
    long: "Each byte carries 7 bits of the value and a flag saying whether another byte follows, except the ninth byte, which uses all 8 bits. Rowids, header sizes and type codes are usually small, so most take one or two bytes. This is SQLite's format; FrankenSQLite reproduces it exactly so the files stay compatible.",
    analogy: "Abbreviating common words and spelling out rare ones.",
  },
  cow: {
    term: "Copy-on-Write",
    short: "Changing a copy of a page instead of the page other transactions might be reading.",
    long: "When a transaction modifies a page, it works on a new version and leaves the committed one alone. Readers that started earlier keep seeing the old version. When the writer commits, its version becomes the newest one, and old versions are cleaned up once no snapshot needs them.",
    analogy:
      "Photocopying a page from a shared binder, editing the copy, and swapping it in when you're done.",
    related: ["mvcc", "btree"],
  },
  aead: {
    term: "AEAD (Authenticated Encryption with Associated Data)",
    short: "Encryption that also detects tampering, in one operation.",
    long: "An AEAD cipher such as XChaCha20-Poly1305 encrypts the data and produces an authentication tag. Decryption fails if the ciphertext, the tag or the associated (unencrypted but authenticated) data was altered. FrankenSQLite's page encryption design uses it per page; that code isn't connected to the public API yet.",
    related: ["argon2id", "dek-kek"],
  },
  argon2id: {
    term: "Argon2id",
    short: "A password-hashing function designed to be expensive on GPUs and custom hardware.",
    long: "Argon2id deliberately uses a configurable amount of memory and time to turn a passphrase into a key, so each guess in a brute-force attack costs real resources. It is the variant recommended for general password hashing.",
    why: "It makes a passphrase much harder to brute-force than a fast hash would.",
    related: ["aead", "dek-kek"],
  },
  "arc-cache": {
    term: "ARC (Adaptive Replacement Cache)",
    short: "A cache eviction policy that balances recently used and frequently used pages.",
    long: "ARC keeps two lists, one for pages seen once recently and one for pages seen more than once, plus 'ghost' lists of recently evicted keys. Hits in the ghost lists tell it which side deserves more room. FrankenSQLite's pager implements ARC as an alternative policy selectable through its API; the default is S3-FIFO.",
    analogy:
      "A librarian who tracks both what was just borrowed and what people asked for after it had been sent back to storage.",
  },
  "write-coordinator": {
    term: "Write Coordinator",
    short: "A planned single task that would batch commits into the WAL.",
    long: "In the design, connections hand validated commits to a coordinator, which appends them to the log in order and groups fsyncs. In the current engine, each connection performs its own commit inside a short guarded section instead, and the coordinator service exists only as scaffolding.",
    analogy:
      "A kitchen where many cooks prepare dishes at once but one expeditor sends plates out in order.",
    related: ["wal"],
  },
  "wal-index": {
    term: "WAL Index (-shm file)",
    short: "A shared-memory hash table that tells readers which WAL frame holds the newest copy of a page.",
    long: "Without it, a reader would have to scan the WAL to find a page. SQLite keeps a hash table in the -shm file, mapping page numbers to frames, that readers can probe directly. FrankenSQLite reads and writes this structure in SQLite's own format.",
    related: ["wal"],
  },
  "conformal-prediction": {
    term: "Conformal Prediction",
    short: "Prediction intervals that hold without assuming the data follows any particular distribution.",
    long: "Latencies are skewed and full of outliers, so intervals built on a normal distribution are often wrong. Conformal methods use recent observations directly to set thresholds with a target coverage rate. FrankenSQLite uses this in one opt-in place: PRAGMA fsqlite.retry_slo_ms caps busy-retry latency based on recent retries.",
  },
  "timeline-profiling": {
    term: "Transaction Telemetry",
    short: "PRAGMAs that report what transactions are doing, while they run.",
    long: "fsqlite_txn_stats gives lifecycle counters, fsqlite_transactions lists active transactions with their age and read/write activity, fsqlite_txn_advisor flags long transactions, large read sets, deep savepoint stacks and rollback pressure, and fsqlite_txn_timeline_json returns the same picture as JSON for timeline tools.",
    why: "With concurrent writers, one slow transaction holds an old snapshot open and raises everyone's conflict rate. You want to see it.",
  },
  "cahill-fekete": {
    term: "Cahill/Fekete Rule",
    short: "The test SSI uses to spot transactions that could break serializability.",
    long: "From Cahill, Röhm and Fekete's 2008 work on serializable snapshot isolation: every non-serializable execution under snapshot isolation contains a 'pivot' transaction with both an incoming and an outgoing read-write antidependency between concurrent transactions. Aborting such pivots is enough to guarantee serializability, at the cost of some false positives.",
    related: ["ssi", "rw-antidependency"],
  },
  "dek-kek": {
    term: "DEK/KEK Envelope Encryption",
    short: "Encrypt data with a random key, then encrypt that key with one derived from your passphrase.",
    long: "A random 256-bit data key (DEK) encrypts the pages. A key-encryption key (KEK), derived from the passphrase with Argon2id, encrypts the DEK. Changing the passphrase only re-wraps the 32-byte DEK, so no page has to be rewritten. This is FrankenSQLite's encryption design; the code isn't reachable from the public API yet.",
    analogy:
      "A safe whose key sits in a lockbox. Changing the lockbox combination doesn't require moving anything in the safe.",
    related: ["aead", "argon2id"],
  },
  "learned-index": {
    term: "Learned Index",
    short: "Replacing (part of) a tree search with a model that predicts where a key is.",
    long: "Sorted keys form a curve from key to position. A learned index fits that curve with a few linear segments, predicts a position, and searches a small window around it. It works best for large, read-mostly data with a smooth key distribution. FrankenSQLite has an implementation in fsqlite-btree that nothing in the query path calls yet.",
    analogy:
      "A librarian who knows roughly where 'R' starts and walks straight there, then scans a couple of shelves.",
    related: ["btree", "database-cracking"],
  },
  "database-cracking": {
    term: "Database Cracking",
    short: "An index that builds itself, one query at a time.",
    long: "Each range query on a column partitions the data around the query's bounds, quicksort-style. Ranges that get asked about often end up finely sorted; ranges nobody asks about stay untouched. FrankenSQLite has an implementation in fsqlite-btree; the engine doesn't use it for queries yet.",
    analogy:
      "Tidying a messy bookshelf only along the lines people actually ask you to find things.",
    related: ["learned-index", "btree"],
  },
  "inactivation-decoding": {
    term: "Inactivation Decoding",
    short: "How RaptorQ decodes quickly: cheap peeling first, Gaussian elimination only on what's left.",
    long: "The decoder first repeatedly solves equations with a single unknown, which often unlocks others in a cascade. When it gets stuck, it sets a few unknowns aside ('inactivates' them), keeps peeling, and finally solves the small leftover system with Gaussian elimination.",
    analogy:
      "Doing the easy edge pieces of a jigsaw first and only puzzling hard over the middle.",
    related: ["raptorq", "gf256"],
  },
  "deterministic-rebase": {
    term: "Deterministic Rebase",
    short: "Re-applying a transaction's intended changes onto a newer version of the page.",
    long: "If a transaction records what it meant to do at the B-tree level (insert this key, delete that one), then after losing a same-page race it could replay those intentions against the winner's page instead of starting over, provided the results don't depend on anything that changed. This is the first rung of the planned merge ladder, which isn't wired into commits yet.",
    analogy: "Like git rebase: replay your commits on top of the latest main.",
    related: ["safe-merge-ladder"],
  },
  "structured-concurrency": {
    term: "Structured Concurrency (asupersync)",
    short: "Async tasks that live inside scopes, so cancelling a scope reliably cancels its children.",
    long: "FrankenSQLite runs on asupersync, a structured-concurrency runtime. Engine work carries a capability context (Cx) that propagates cancellation and budgets to everything it starts. Cancellation is a protocol (request, drain, finalize) rather than just dropping a future, so work stops at well-defined points.",
    why: "A cancelled query shouldn't leave background work running, and a long query should be interruptible.",
  },
  "swizzle-pointer": {
    term: "Pointer Swizzling",
    short: "Replacing an on-disk page ID with a direct memory pointer once the page is cached.",
    long: "A child reference can hold either a page number or, once the page is in memory, a direct pointer to it, distinguished by a tag bit. Traversals of hot pages then skip the page-cache lookup. FrankenSQLite has an implementation in fsqlite-btree that isn't used by the engine's cache yet.",
    related: ["btree", "cooling-protocol"],
  },
  "cooling-protocol": {
    term: "Cooling Protocol",
    short: "Making cached pages pass through a 'cooling' stage before they can be evicted.",
    long: "From LeanStore: pages are HOT while in use. A background process moves some to COOLING; if one is touched again, it goes back to HOT, and if not, it can be evicted. FrankenSQLite has an implementation in fsqlite-btree; the pager's actual policy is S3-FIFO.",
    related: ["arc-cache", "swizzle-pointer"],
  },
  "e-process": {
    term: "E-Process",
    short: "A statistical test you can check after every observation without inflating false alarms.",
    long: "Ordinary tests assume you look at the result once. An e-process is a running bet against the hypothesis that keeps its false-alarm guarantee no matter when you stop and look. FrankenSQLite's harness uses e-processes to watch MVCC invariants during long tests, and a research-grade opt-in mode (PRAGMA fsqlite.write_merge = LAB_UNSAFE) uses one to skip some SSI checks.",
  },
  "mazurkiewicz-trace": {
    term: "Mazurkiewicz Trace",
    short: "A class of thread schedules that differ only in the order of independent steps.",
    long: "If two steps don't affect each other, such as two transactions reading different pages, swapping them doesn't change the outcome. A Mazurkiewicz trace groups all schedules that are equal up to such swaps, so a test only needs to run one schedule per group.",
    related: ["dpor", "foata"],
  },
  dpor: {
    term: "DPOR (Dynamic Partial-Order Reduction)",
    short: "Systematically exploring thread schedules while skipping equivalent ones.",
    long: "Instead of trying random schedules, DPOR runs a schedule, looks at which steps actually conflicted, and only branches where reordering could change the result. Within the bounds of a test, it covers every distinct outcome without running every interleaving. FrankenSQLite uses it in testing, through its runtime's deterministic lab mode.",
    analogy: "Exploring a maze but skipping corridors you already know lead back to the same room.",
    related: ["mazurkiewicz-trace"],
  },
};

export function getJargon(key: string): JargonTerm | undefined {
  const normalizedKey = key.toLowerCase().replace(/[\s_]+/g, "-");
  return jargonDictionary[normalizedKey];
}
