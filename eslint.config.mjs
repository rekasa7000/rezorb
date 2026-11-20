import next from "eslint-config-next";

const config = [
  ...next,
  { ignores: [".next/**", "node_modules/**", "src/server/db/migrations/**", "next-env.d.ts"] },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
