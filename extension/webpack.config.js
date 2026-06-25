const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env, argv) => {
  const isDev = argv.mode === "development";

  return {
    // ── Entry Points ──────────────────────────────────────────────────────
    entry: {
      background: "./src/background/background.ts",
      content: "./src/content/content.ts",
      sidebar: "./src/sidebar/index.tsx",
    },

    // ── Output ────────────────────────────────────────────────────────────
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      clean: true,
    },

    // ── Resolve ───────────────────────────────────────────────────────────
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      alias: {
        "@shared": path.resolve(__dirname, "src/shared"),
        "@sidebar": path.resolve(__dirname, "src/sidebar"),
        "@content": path.resolve(__dirname, "src/content"),
        "@background": path.resolve(__dirname, "src/background"),
      },
    },

    // ── Module Rules ──────────────────────────────────────────────────────
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: ["tailwindcss", "autoprefixer"],
                },
              },
            },
          ],
        },
      ],
    },

    // ── Plugins ───────────────────────────────────────────────────────────
    plugins: [
      new MiniCssExtractPlugin({
        filename: "[name].css",
      }),

      new HtmlWebpackPlugin({
        template: "./public/sidebar.html",
        filename: "sidebar.html",
        chunks: ["sidebar"],
        inject: "body",
      }),

      new CopyWebpackPlugin({
        patterns: [
          { from: "public/manifest.json", to: "manifest.json" },
          // content.css must be copied explicitly — it's not imported by any TS entry point
          // Chrome extensions require standalone CSS files referenced in manifest
          { from: "src/content/content.css", to: "content.css" },
          {
            from: "public/icons",
            to: "icons",
            noErrorOnMissing: true,
          },
        ],
      }),
    ],

    devtool: isDev ? "cheap-module-source-map" : false,

    optimization: {
      splitChunks: false,
    },

    performance: {
      hints: false,
    },
  };
};
