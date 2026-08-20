import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  {
    ignores: [".next/**", "dist-server/**", "node_modules/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Lint has never actually run on this repo, so the existing `any`s (mostly the
      // serializers in src/server/serialize.ts) surface as errors on day one. Kept as a
      // warning so the config can land and stay enforcing; tighten back to "error" once
      // those are typed against the Prisma payload types.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
