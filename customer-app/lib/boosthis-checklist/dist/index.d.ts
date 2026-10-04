/**
 * boosthis-checklist — the React Native performance rule book (pure data).
 *
 * This is the EDITABLE SOURCE of truth for the RN checklist, the sibling of
 * `lib/boosthis-runtime-node/src/checklist.ts` (Node) and
 * `lib/boosthis-py/boosthis/checklist.py` (Python). It builds to `dist/` via the
 * root `tsc --build` (the package is referenced from the root tsconfig). The
 * built `dist/index.js` is what Metro and the blind-copied drop-in kit consume
 * at runtime, so `dist/` is committed alongside this source.
 *
 * Each entry ships its DETECTOR on-device (`whenToApply` + `evidence`); the
 * prescriptive fix text lives server-only in `lib/boosthis-fixes`.
 */
export type Category = "case-study" | "industry" | "operational";
export interface BoosthisChecklistEntry {
    id: string;
    title: string;
    /** When this rule applies — what code shape triggers a check. */
    whenToApply: string;
    /** Files / commits / external references where this rule was
     *  validated against a real regression. */
    evidence: string[];
    /** Provenance bucket, shared shape with the Node/Python/Web checklists so
     *  cross-runtime tooling can group any rule entry uniformly. */
    category: Category;
    /** Always ["react-native"] for this pack. Present for cross-runtime symmetry
     *  with the Node (["node"]), Python (["python"]) and Web (["web"]) packs. */
    languages: ReadonlyArray<"react-native">;
}
/**
 * The RN checklist, each entry enriched with its `category` + `languages` so it
 * shares the exact shape of the Node/Python/Web packs. This is the exported,
 * runtime-consumed source of truth (the blind-copied kit reads the built form).
 */
export declare const BOOSTHIS_CHECKLIST: ReadonlyArray<BoosthisChecklistEntry>;
/** Look up a single entry by id. Returns undefined if not found. */
export declare function getChecklistEntry(id: string): BoosthisChecklistEntry | undefined;
/** All entry ids, in the order they appear in the checklist. */
export declare function listChecklistIds(): readonly string[];
export declare const CHECKLIST_VERSION = "0.1.0";
/** Total count — useful for "X / N rules satisfied" UI. */
export declare const CHECKLIST_COUNT: number;
//# sourceMappingURL=index.d.ts.map