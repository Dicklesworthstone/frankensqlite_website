export interface JargonTerm {
  term: string;
  short: string;
  long: string;
  analogy?: string;
  why?: string;
  related?: string[];
}

export const jargonDictionary: Record<string, JargonTerm> = {
  mvcc: {
    term: "MVCC (Multi-Version Concurrency Control)",
    short:
      "A database technique that allows multiple readers and writers to operate simultaneously without blocking each other.",
    long: "Instead of locking a row or page when writing, MVCC creates a new version of it. Readers continue to read the old version (a consistent snapshot) while the writer works on the new one. When the writer commits, the new version becomes the current one for future transactions.",
    analogy:
      "Like editing a shared document on Google Docs. You can make changes on your screen while someone else reads the last saved version. Nobody is locked out.",
    why: "It eliminates the SQLITE_BUSY error caused by the global write lock in C SQLite, enabling true concurrent access.",
    related: ["snapshot-isolation", "fcw", "wal"],
  },
  "snapshot-isolation": {
    term: "Snapshot Isolation",
    short:
      "A guarantee that a transaction sees a consistent view of the database from the moment it began.",
    long: "When a transaction starts, it's assigned a read timestamp. It ignores any changes committed by other transactions after that timestamp. This prevents dirty reads, non-repeatable reads, and phantom reads.",
    analogy:
      "Taking a photograph of a busy street. The people in your photo are frozen in time, regardless of what they do after the shutter clicks.",
    related: ["mvcc", "ssi"],
  },
  fcw: {
    term: "First-Committer-Wins (FCW)",
    short:
      "A rule for resolving conflicts when two transactions try to modify the same data at the same time.",
    long: "If two concurrent transactions modify the same page, the first one to commit succeeds. The second one detects that the underlying page changed since its snapshot was taken, causing it to abort and retry.",
    analogy:
      "Two people trying to buy the last concert ticket online. Whoever clicks 'Checkout' first gets it; the other gets a 'Sold Out' error and must pick a different seat.",
    related: ["mvcc", "ssi"],
  },
  ssi: {
    term: "Serializable Snapshot Isolation (SSI)",
    short:
      "The gold standard of database isolation, preventing subtle 'write skew' anomalies without slow locks.",
    long: "SSI tracks what data transactions read and write to detect cyclic dependencies that could cause data corruption (like two doctors on call both taking the day off because they see the other is working). FrankenSQLite uses a specialized page-level SSI variant.",
    analogy:
      "Two pilots independently checking weather before takeoff. Each sees a safe forecast, but together their decisions could conflict. SSI catches the conflict before either plane leaves the gate.",
    why: "It provides the safety of running transactions one-by-one, but with the performance of running them all at once.",
    related: ["fcw", "snapshot-isolation"],
  },
  raptorq: {
    term: "RaptorQ (RFC 6330)",
    short:
      "Fountain erasure codes that reconstruct corrupted or missing data from redundant repair symbols.",
    long: "RaptorQ generates as many repair symbols as needed from a source block. If disk corruption destroys some source symbols, FrankenSQLite feeds the surviving source symbols plus enough repair symbols into the decoder to reconstruct the originals. Any K symbols out of K+R are sufficient.",
    analogy:
      "A hologram of your data. Scratch part of the disk and the data is still recoverable; the remaining pieces plus some parity fragments are enough to reconstruct the damaged region.",
    why: "It provides self-healing against silent data corruption without external backup systems. Two extra repair symbols give a >99.99% recovery guarantee.",
    related: ["ecs", "gf256"],
  },
  gf256: {
    term: "GF(256) Finite Field",
    short:
      "The finite field that makes RaptorQ's error correction work: arithmetic that wraps around instead of overflowing.",
    long: "All RaptorQ encoding and decoding operates over the Galois Field with 256 elements (one per byte value). Addition is XOR, multiplication uses lookup tables. This guarantees that the system of equations used to reconstruct data has full rank; 2 extra repair symbols yield a >99.99% recovery probability.",
    why: "It turns data recovery into solving a system of linear equations with a guaranteed unique solution. No heuristics, no approximation. Exact reconstruction from first principles.",
    related: ["raptorq"],
  },
  wal: {
    term: "WAL (Write-Ahead Log)",
    short:
      "An append-only file where database changes are written before being applied to the main file.",
    long: "In standard SQLite, the WAL allows one writer to append changes while readers read from the main file. FrankenSQLite extends this, allowing multiple writers to append independent page versions simultaneously.",
    analogy:
      "A doctor's notepad. The doctor jots down quick notes during the day (the WAL) and later officially transcribes them into the patients' permanent files (the main database).",
    related: ["mvcc"],
  },
  ecs: {
    term: "ECS (Erasure-Coded Stream)",
    short: "FrankenSQLite's native append-only storage format with built-in erasure coding.",
    long: "Unlike the standard B-tree format, ECS is an append-only sequence of immutable page versions combined with RaptorQ repair symbols. It natively supports time-travel queries and is structurally immune to many types of corruption.",
    why: "It trades a small amount of disk space for large gains in durability and historical observability.",
    related: ["raptorq", "mvcc"],
  },
  vdbe: {
    term: "VDBE (Virtual Database Engine)",
    short: "The invisible 'virtual machine' that executes your SQL queries.",
    long: "SQL is a declarative language (you say *what* you want, not *how* to get it). The parser and query planner translate your SQL into a program of low-level instructions (opcodes). The VDBE runs these instructions to actually fetch and filter the data.",
    analogy:
      "Like a compiler turning human-readable C++ code into machine code that the CPU can actually execute.",
    related: ["sql-dialect"],
  },
  "zero-unsafe": {
    term: "Zero Unsafe Blocks",
    short: "A strict architectural rule guaranteeing the absence of memory bugs.",
    long: "Rust allows developers to bypass safety checks using the 'unsafe' keyword. FrankenSQLite is built with a strict #![forbid(unsafe_code)] rule across all 26 crates. This mathematically prevents entire classes of vulnerabilities like buffer overflows, use-after-free, and data races.",
    why: "It means the database engine is structurally incapable of experiencing the most common security flaws found in C-based systems.",
  },
  "witness-plane": {
    term: "Witness Plane",
    short: "An evidence-tracking layer that records which transactions read and wrote which pages.",
    long: "The witness plane maintains a directed graph of RW-antidependencies between concurrent transactions. At commit time, FrankenSQLite checks this graph for dangerous cycles that could cause write-skew anomalies under SSI.",
    analogy:
      "Like a security camera network: it doesn't stop you from entering a room, but it records exactly who went where, so conflicts can be detected after the fact.",
    why: "It enables SSI validation without heavyweight locks, keeping the database fast while guaranteeing correctness.",
    related: ["ssi", "rw-antidependency"],
  },
  "safe-merge-ladder": {
    term: "Safe Merge Ladder",
    short:
      "A 4-strategy conflict resolution pipeline that tries progressively stronger merge techniques.",
    long: "When two transactions conflict, FrankenSQLite doesn't immediately abort. It tries four strategies in order: (1) Intent Replay: re-apply the logical operation, (2) FOATA merge: canonical reordering of independent operations, (3) XOR Delta: byte-level diff merge, (4) Abort: only as a last resort.",
    why: "Most 'conflicts' in real workloads can be merged safely. The ladder reduces unnecessary aborts by orders of magnitude.",
    related: ["foata", "xor-delta", "fcw"],
  },
  foata: {
    term: "FOATA Normal Form",
    short: "A canonical ordering of operations so independent writes can be merged automatically.",
    long: "Named after mathematician Dominique Foata, FOATA normal form partitions concurrent operations into equivalence classes based on commutativity. If two writes don't interfere with each other, they can be reordered into a canonical sequence and merged safely.",
    analogy:
      "Like sorting a deck of cards where some cards commute (can swap places without affecting the outcome). FOATA finds the canonical sorted order.",
    related: ["safe-merge-ladder", "xor-delta"],
  },
  "xor-delta": {
    term: "XOR Delta",
    short: "A sparse byte-level diff between page versions for compact version chains.",
    long: "Instead of storing full copies of modified pages, FrankenSQLite XORs the old and new versions. The result is a sparse delta where unchanged bytes are zero. If less than 25% of the page changed, this delta is stored instead of a full copy, saving up to 93% of version chain storage.",
    analogy:
      "Like a diff in a word processor that only records what changed, not the entire document. XOR is the mathematical equivalent for raw binary data.",
    why: "It makes MVCC version chains far more space-efficient, enabling longer time-travel windows without excessive storage.",
    related: ["mvcc", "safe-merge-ladder"],
  },
  "wal-fec": {
    term: "WAL-FEC",
    short: "Forward error correction applied to WAL commit groups.",
    long: "Each batch of pages written to the WAL is augmented with RaptorQ repair symbols. If a power failure or disk error corrupts part of a commit group, the FEC symbols allow automatic recovery without losing the entire batch.",
    related: ["wal", "raptorq"],
  },
  "content-addressed": {
    term: "Content-Addressed Storage",
    short: "Objects identified by the BLAKE3 hash of their contents.",
    long: "Every page version in ECS format is addressed by a 256-bit BLAKE3 hash. This provides automatic deduplication, tamper detection, and integrity verification without separate checksum infrastructure.",
    analogy:
      "Like Git, where every file and commit is identified by a SHA hash. If the content changes, the address changes, and tampering is immediately detectable.",
    related: ["ecs", "raptorq"],
  },
  "repair-symbol": {
    term: "Repair Symbol",
    short: "Redundant parity data generated by RaptorQ for corruption recovery.",
    long: "Given K source symbols (chunks of a database page), RaptorQ generates R repair symbols. Any K symbols out of the total K+R are sufficient to reconstruct the original data. More repair symbols = higher redundancy = better resilience.",
    related: ["raptorq", "ecs"],
  },
  "rw-antidependency": {
    term: "RW-Antidependency",
    short: "A read-write conflict edge: the basis for SSI validation.",
    long: "When transaction T1 reads a page that transaction T2 later writes, an RW-antidependency edge is created from T1 to T2. Two consecutive RW-antidependency edges forming a cycle indicate a potential write-skew anomaly.",
    related: ["ssi", "witness-plane"],
  },
  "newtype-pattern": {
    term: "Newtype Pattern",
    short:
      "Rust wrapper types that prevent accidentally mixing PageNumber with TxnId at compile time.",
    long: "FrankenSQLite wraps raw integers in distinct types like PageNumber(u32), TxnId(u64), and FrameIndex(u32). The Rust type system ensures you can never accidentally pass a transaction ID where a page number is expected.",
    why: "It eliminates an entire class of logic bugs at zero runtime cost. The compiler catches the mistake before your code ever runs.",
  },
  "time-travel": {
    term: "Time-Travel Query",
    short: "Query historical database state at any past point in time.",
    long: "Using FOR SYSTEM_TIME AS OF with a commit sequence number or timestamp, you can inspect the database exactly as it looked at any prior moment. No snapshots, no forks, no replicas needed. The MVCC version chain holds the full history.",
    related: ["mvcc", "snapshot-isolation", "ecs"],
  },
  btree: {
    term: "B-tree",
    short:
      "Balanced tree index: the core data structure for row storage in SQLite-format databases.",
    long: "A B-tree keeps data sorted and allows searches, sequential access, insertions, and deletions in logarithmic time. FrankenSQLite's B-tree implementation uses copy-on-write pages for MVCC compatibility.",
    related: ["mvcc"],
  },
  "sql-dialect": {
    term: "SQLite SQL Dialect",
    short:
      "The full SQL language supported by SQLite, including joins, CTEs, window functions, and triggers.",
    long: "FrankenSQLite implements the complete SQLite SQL dialect through a hand-written recursive descent parser. This includes SELECT with joins and subqueries, CTEs (WITH clauses), window functions, triggers, views, and all standard DML operations.",
    related: ["vdbe"],
  },
  "systematic-layout": {
    term: "Systematic Layout",
    short:
      "An ECS encoding where the first K symbols are the raw source data, enabling zero-copy reads.",
    long: "In a systematic RaptorQ code, the first K encoded symbols are identical to the original K source symbols. Normal reads need no decoding; you read the data directly. Repair symbols are only consulted when corruption is detected.",
    why: "It gives you the durability of erasure coding with the read performance of raw storage. You only pay the decoding cost when something goes wrong.",
    related: ["ecs", "raptorq", "repair-symbol"],
  },
  bocpd: {
    term: "BOCPD (Bayesian Online Change-Point Detection)",
    short: "An algorithm that detects shifts in database workload patterns in real time.",
    long: "Database workloads are non-stationary (e.g., a quiet night suddenly turns into a write-heavy analytics job). BOCPD maintains a probability distribution over 'run lengths' (how long the current regime has lasted). When the distribution shifts, the engine dynamically re-tunes its garbage collection and compaction heuristics.",
    analogy:
      "Like a smart thermostat that doesn't just measure temperature, but mathematically proves when the seasons have changed so it can switch entirely from AC to Heating mode.",
    why: "It eliminates the need for manual tuning of GC thresholds or compaction triggers. The database continuously adapts to reality.",
  },
  "sheaf-theoretic": {
    term: "Sheaf-Theoretic Consistency",
    short:
      "A mathematical framework for proving that a distributed or highly concurrent system is truly consistent.",
    long: "Standard tests compare pairs of transactions. But a 'phantom global commit' can occur where no two nodes disagree, yet the global state is impossible. Sheaf theory treats each transaction's view as a 'local section' and verifies that all sections can be smoothly glued together into a valid global state.",
    why: "It provides rigorous mathematical proof that the MVCC engine hasn't violated serializability across complex, multi-process interleavings.",
  },
  varint: {
    term: "Varint Encoding",
    short: "A compression technique for integers to save disk space.",
    long: "Instead of always using 8 bytes for a 64-bit integer, a varint uses 1 byte for small numbers, 2 bytes for medium numbers, and up to 9 bytes for the largest numbers. The high bit of each byte signals if more bytes follow.",
    analogy:
      "Like using abbreviations for common words in a text message, but spelling out rare words fully.",
    why: "Row IDs and type codes are usually very small numbers. Varint encoding shrinks the overall database file size by 30-50%.",
  },
  cow: {
    term: "Copy-on-Write (CoW)",
    short: "Write to a copy, not the original page: the physical mechanism behind MVCC.",
    long: "When a transaction modifies a B-tree page, it doesn't overwrite the original. Instead, a new copy is created with the changes applied. Parent pointers are updated to reference the new copy, creating a new root that coexists with the old one. Old readers continue using the old root; new readers use the new one.",
    analogy:
      "Like photocopying a page from a shared binder, making edits on the copy, and then swapping it in. Other people reading the binder see the original until you're done.",
    why: "It enables lock-free reads and MVCC without complex locking protocols. Readers never block writers, and writers never block readers.",
    related: ["mvcc", "btree"],
  },
  aead: {
    term: "AEAD (Authenticated Encryption with Associated Data)",
    short:
      "Encrypt and integrity-check in one operation; tampered data is rejected before decryption.",
    long: "AEAD ciphers like XChaCha20-Poly1305 combine encryption (confidentiality) with authentication (integrity) in a single pass. The 'associated data' (like a page number) is authenticated but not encrypted, binding ciphertext to its context. Moving ciphertext to a different page slot is detected and rejected.",
    why: "It prevents both eavesdropping and tampering in one operation, with no additional overhead for separate MAC computation.",
    related: ["argon2id"],
  },
  argon2id: {
    term: "Argon2id",
    short: "Memory-hard key derivation function that resists GPU and ASIC brute-force attacks.",
    long: "Argon2id combines the side-channel resistance of Argon2i with the GPU resistance of Argon2d. It requires a configurable amount of memory (e.g., 64MB) and CPU time to derive a key from a passphrase, making brute-force attacks prohibitively expensive even with specialized hardware.",
    analogy:
      "Like a lock that takes 2 seconds to open even with the right key. A burglar trying millions of keys per second on a normal lock is reduced to trying one every 2 seconds.",
    why: "It ensures that a weak passphrase still produces a strong encryption key, because each guess costs real time and memory.",
    related: ["aead"],
  },
  "arc-cache": {
    term: "ARC (Adaptive Replacement Cache)",
    short: "A self-tuning page cache that balances recency and frequency.",
    long: "Standard LRU caches get wiped out by a single full-table scan. ARC maintains four lists (recent, frequent, and two 'ghost' lists) to constantly adjust its bias based on the actual workload.",
    analogy:
      "Like a librarian who not only remembers what books were just checked out, but keeps a separate list of books people *asked* for but weren't on the shelf, adjusting their buying habits accordingly.",
    why: "It achieves better cache hit rates than LRU without requiring manual tuning of memory partitions.",
  },
  "write-coordinator": {
    term: "Write Coordinator",
    short: "A single background thread that serializes commits and WAL writes.",
    long: "Instead of multi-threaded locking for the disk, FrankenSQLite uses a single Write Coordinator. Worker threads handle B-tree modifications in parallel, then submit a 'commit request' to the coordinator. The coordinator validates and appends to the WAL sequentially.",
    analogy:
      "Like a busy restaurant kitchen where many chefs cook dishes in parallel, but only one expeditor plates the food and hands it to the waiters to ensure no orders get mixed up.",
    why: "It completely avoids deadlocks, eliminates the need for expensive two-phase commit protocols, and maximizes SSD sequential write performance.",
  },
  "wal-index": {
    term: "WAL Index (-shm file)",
    short:
      "A lock-free hash table stored in shared memory to map database pages to their WAL frames.",
    long: "When a reader wants to read a page, it needs to know if a newer version exists in the WAL. It hashes the page number and does a fast linear probe through a memory-mapped file. Because the load factor is strictly kept below 0.5, it almost always finds the answer instantly without executing any system calls or acquiring any read locks.",
    why: "It allows thousands of concurrent readers to find their data simultaneously without bottlenecking on a shared mutex.",
    related: ["wal"],
  },
  "conformal-prediction": {
    term: "Conformal Prediction",
    short:
      "A statistical method for creating confidence intervals that works on ANY data distribution.",
    long: "Standard statistics assume data follows a normal distribution. Database latencies do not: they have heavy, skewed tails from GC pauses, page splits, and I/O stalls. Conformal prediction computes a threshold that guarantees coverage regardless of the underlying distribution.",
    analogy:
      "Instead of saying 'the weather will probably be within 5 degrees of the average', it mathematically proves 'I guarantee it will not exceed this exact maximum boundary, no matter how chaotic the climate is'.",
    why: "It allows the FrankenSQLite test harness to mathematically prove that performance hasn't regressed, rather than just eyeballing noisy benchmark charts.",
  },
  "timeline-profiling": {
    term: "Timeline Profiling",
    short: "Native transaction tracing that outputs Chrome DevTools compatible JSON.",
    long: "Instead of relying on external APM tools, FrankenSQLite has an observability layer built directly into the engine. It tracks the exact microsecond a transaction begins, reads, writes, savepoints, and commits. The output can be dropped directly into Chrome's performance profiler.",
    why: "It gives developers MRI-level visibility into exactly where their database time is going.",
  },
  "cahill-fekete": {
    term: "Cahill/Fekete Rule",
    short: "The mathematical rule used by the SSI engine to prevent write skew.",
    long: "Named after the computer scientists who formalized it, this rule looks for a specific pattern in the Witness Plane: a 'pivot' transaction that has both an incoming read-write dependency and an outgoing read-write dependency. If this structure forms, the pivot is safely aborted.",
    related: ["ssi", "witness-plane"],
  },
  "dek-kek": {
    term: "DEK/KEK Envelope Encryption",
    short: "A two-tier key hierarchy that makes database re-keying instantaneous.",
    long: "A random 256-bit Data Encryption Key (DEK) encrypts every page via XChaCha20-Poly1305. A Key Encryption Key (KEK), derived from the user's passphrase through Argon2id, wraps the DEK. Re-keying the database means rewrapping one 32-byte blob with a new KEK; the billions of encrypted pages stay untouched.",
    analogy:
      "A safe with two locks. The inner lock (DEK) protects the contents. The outer lock (KEK) protects the inner key. Changing the combination on the outer lock takes seconds, and nothing inside the safe needs to move.",
    why: "Without envelope encryption, changing a passphrase would require decrypting and re-encrypting every page, potentially hours for a large database. DEK/KEK makes PRAGMA rekey an O(1) operation.",
    related: ["aead", "argon2id"],
  },
  "learned-index": {
    term: "Learned Index",
    short:
      "A lightweight ML model that predicts where a key lives on disk, replacing tree traversal with arithmetic.",
    long: "Instead of walking a B-tree from root to leaf (O(log N) random reads), a learned index fits a piecewise linear model to the sorted key distribution. Lookup becomes: binary-search the model segments, compute intercept + slope × key, then do a bounded linear scan within ±max_error positions. FrankenSQLite uses greedy segment training with a default error bound of 16 positions.",
    analogy:
      "A library where instead of checking every shelf sign from the entrance, someone hands you a formula: 'Romance novels start at shelf 42 plus one shelf per 100 titles after R.' You walk directly there and scan a few nearby shelves.",
    why: "It turns O(log N) random I/O into O(1) model inference plus a short sequential scan, a large win on modern SSDs where sequential access is orders of magnitude faster than random.",
    related: ["btree", "database-cracking"],
  },
  "database-cracking": {
    term: "Database Cracking",
    short: "An index that builds itself as queries arrive. Zero configuration, zero upfront cost.",
    long: "The first range query on an unindexed column partitions the data in-place around the query bounds using Hoare partitioning. Each subsequent query refines the partitions further. After Q queries on N elements, lookup cost drops from O(N) to O(N/Q). Frequently queried ranges converge toward fully sorted order without any CREATE INDEX statement.",
    analogy:
      "An unsorted bookshelf. The first time someone asks for authors A–F, you roughly separate those to one side. The next query for A–C splits that group further. Over time, the shelf organizes itself around the questions people actually ask.",
    why: "DBAs spend enormous effort deciding which columns to index. Cracking eliminates that decision. The workload itself teaches the index what matters.",
    related: ["learned-index", "btree"],
  },
  "inactivation-decoding": {
    term: "Inactivation Decoding",
    short: "A two-phase RaptorQ optimization that exploits matrix sparsity to recover data faster.",
    long: "Phase 1 (peeling) iteratively solves encoding equations with degree 1; each solution reduces the degree of connected symbols, creating a cascade. When no more degree-1 equations remain, phase 2 runs Gaussian elimination on the small residual system. The peeling phase 'inactivates' most of the coefficient matrix, so the expensive elimination step operates on a fraction of the original size.",
    analogy:
      "Solving a jigsaw puzzle by placing all the edge pieces first (trivial, cascading constraints) and then filling in the small remaining center. The edges peel off cheaply; only the center requires brute force.",
    why: "Naive Gaussian elimination on the full RaptorQ system is O(K³). Inactivation reduces this to O(K) for the peeling phase plus O(L'³) for a much smaller residual L', often 100x faster for large source blocks.",
    related: ["raptorq", "gf256"],
  },
  "deterministic-rebase": {
    term: "Deterministic Rebase",
    short:
      "Replaying a transaction's intent log against a newer snapshot. Think git rebase for database commits.",
    long: "Instead of discarding a conflicting transaction's work, FrankenSQLite records its semantic operations (INSERT, UPDATE, DELETE with deterministic expressions) in an intent log. On conflict, the log is replayed against the current committed state. The result is deterministic as long as all expressions are free of RANDOM(), CURRENT_TIME, subqueries, and other non-deterministic constructs.",
    analogy:
      "You wrote edits on an old draft of a shared document. Instead of throwing your edits away, someone re-applies your changes onto the latest draft. As long as your edits are self-contained (no 'change whatever Bob wrote'), the result is identical every time.",
    why: "Simple retry re-executes the entire transaction from scratch, reintroducing race conditions. Rebase preserves the original work and merges it deterministically, the first rung of the safe merge ladder.",
    related: ["safe-merge-ladder", "foata"],
  },
  "structured-concurrency": {
    term: "Structured Concurrency (Cx)",
    short:
      "Every async operation runs within a parent scope that guarantees cleanup. No orphaned tasks, no leaked resources.",
    long: "FrankenSQLite threads a capability context (Cx) through every operation. Cx carries cancellation signals, budget limits (deadline, poll quota, cost quota, priority), and tracing spans. Budgets combine via a mixed lattice: deadlines and quotas take the tighter limit (meet), priorities take the higher value (join). When any budget is exhausted, cancellation propagates to all children.",
    analogy:
      "A corporate expense policy that flows from CEO to department to team. Each level can tighten the budget but never loosen it. If the department runs out of funds, every team under it stops spending automatically.",
    why: "Without structured concurrency, a cancelled query can leave background RaptorQ encode jobs running forever. Cx guarantees that cancelling a parent cancels all children, deterministically, with no cleanup races.",
    related: ["mvcc"],
  },
  "swizzle-pointer": {
    term: "Swizzle Pointer",
    short:
      "An atomic tagged pointer that flips between a disk page ID and an in-memory address in one CAS.",
    long: "B-tree child references store an AtomicU64 with a 1-bit tag. Tag 0 means the upper 63 bits hold an on-disk page ID. Tag 1 means the value (minus the tag bit) is a direct memory frame address. On first access, a compare-and-swap atomically replaces the page ID with the frame pointer. Subsequent traversals skip the page cache lookup entirely.",
    analogy:
      "A phone contact that starts as a name (requiring a directory lookup). After the first call, it silently rewrites itself to a direct-dial number. Every future call connects instantly.",
    why: "B-tree traversals hit the same interior pages repeatedly. Swizzling eliminates the hash-table lookup in the page cache for hot pages, shaving overhead off every single tree descent.",
    related: ["btree", "cooling-protocol"],
  },
  "cooling-protocol": {
    term: "Cooling Protocol",
    short:
      "A HOT/COOLING/COLD state machine that protects active pages from eviction while reclaiming idle ones.",
    long: "Adapted from LeanStore, every cached page has a temperature. Freshly loaded or recently accessed pages are HOT and immune to eviction. A background scan demotes infrequently accessed pages to COOLING. If a COOLING page is accessed again, it reheats to HOT. Only COOLING pages can be evicted to COLD. Root pages are permanently pinned HOT.",
    analogy:
      "A restaurant kitchen where frequently ordered dishes stay on the hot line. Dishes nobody has ordered recently move to the prep station. If a new order comes in, they go back to the hot line. Only prep station dishes get put back in the walk-in cooler. The head chef's signature dish never leaves the hot line.",
    why: "Standard LRU eviction can thrash the buffer pool during a single full-table scan. The cooling protocol adds a grace period: a page must survive one full cooling cycle without being re-accessed before eviction, reducing cache churn.",
    related: ["arc-cache", "swizzle-pointer", "btree"],
  },
  "e-process": {
    term: "E-Process",
    short:
      "A statistical martingale that monitors database invariants continuously without needing a fixed sample size.",
    long: "Traditional statistical tests require you to know exactly how many samples you are going to take beforehand. An e-process is an 'anytime-valid' sequential test. It continuously bets that an invariant holds. If the invariant is violated, the bet wins and the value explodes exponentially, triggering an alert with a mathematically bounded false-positive rate.",
    why: "It allows the engine to mathematically prove that its concurrency model is safe across millions of transactions running in production, stopping the system immediately if the math detects a violation.",
  },
  "mazurkiewicz-trace": {
    term: "Mazurkiewicz Trace",
    short: "A mathematical equivalence class of execution schedules.",
    long: "When multiple threads run at the same time, their instructions can interleave in millions of ways. A Mazurkiewicz trace uses an 'independence relation' to group these interleavings. For example, if T1 reading Page A and T2 reading Page B don't affect each other, swapping their order doesn't change the outcome. Both orders belong to the same trace.",
    related: ["dpor"],
  },
  dpor: {
    term: "DPOR (Dynamic Partial Order Reduction)",
    short: "An algorithm that makes exhaustive concurrency testing possible.",
    long: "Instead of randomly fuzzing thread schedules and hoping to hit a bug, DPOR explores the execution space systematically. Because it understands Mazurkiewicz traces, it only executes one 'canonical' path per equivalence class. It prunes out all the redundant paths that are mathematically guaranteed to yield the same result.",
    analogy:
      "Like navigating a maze by only testing paths that actually fork into new territory, completely ignoring paths that you've already proven loop back to the exact same room.",
    why: "It reduces billions of possible concurrency interleavings into a few dozen, making it possible to mathematically prove that a multi-threaded system is bug-free.",
    related: ["mazurkiewicz-trace"],
  },
};

export function getJargon(key: string): JargonTerm | undefined {
  const normalizedKey = key.toLowerCase().replace(/[\s_]+/g, "-");
  return jargonDictionary[normalizedKey];
}
