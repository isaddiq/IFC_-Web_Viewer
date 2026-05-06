import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "src/ifc-loader-global.js",
  external: ["three"],
  output: {
    file: "assets/js/bundle.js",
    format: "iife",
    name: "IFCWebViewerBundle",
    globals: {
      three: "THREE",
    },
  },
  plugins: [
    nodeResolve({
      browser: true,
    }),
  ],
};
