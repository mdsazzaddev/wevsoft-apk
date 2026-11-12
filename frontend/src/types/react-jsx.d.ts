/**
 * Why this file exists.
 *
 * `@types/react` is not installed in this project (it appears in bun.lock only as
 * a transitive entry and is absent from node_modules), so TypeScript sees `react`
 * as an untyped module: `React.ReactNode` and friends degrade to `any`, which is
 * harmless, but no `JSX.IntrinsicAttributes` is in scope either. The visible
 * symptom is that `key` — an attribute React itself consumes and never passes to
 * the component — is checked against each component's own props type and reported
 * as TS2322 "Property 'key' does not exist".
 *
 * Rather than every component in the codebase declaring a fake `key?` in its own
 * props (which would also let a real typo through), this declares the JSX
 * attribute set React actually reserves. Installing `@types/react` later
 * supersedes this file and it can be deleted.
 */

declare namespace JSX {
  interface IntrinsicAttributes {
    /** Consumed by React for list reconciliation; never reaches the component. */
    key?: string | number | bigint | null;
  }
}
