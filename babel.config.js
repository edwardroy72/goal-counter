module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "inline-import",
        {
          extensions: [".sql"],
        },
      ],
      "react-native-reanimated/plugin", // Keep this at the very end
    ],
  };
};
