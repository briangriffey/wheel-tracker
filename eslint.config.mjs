import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["lib/generated/**/*"],
  },
  {
    rules: {
      // Warn about deprecated pattern usage
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/lib/utils/position-calculations",
              message:
                "This module contains deprecated utilities. Use @/lib/calculations/position for position calculations, @/lib/design/colors for color utilities, and create @/lib/utils/format for formatting functions.",
            },
          ],
          patterns: [
            {
              group: ["**/lib/utils/position-calculations"],
              message:
                "Deprecated: Use @/lib/calculations/position for calculations and @/lib/design/colors for color utilities instead.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
