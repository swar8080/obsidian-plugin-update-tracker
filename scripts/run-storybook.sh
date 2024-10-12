mkdir -p node_modules/obsidian
cp scripts/node_modules-obsidian/index node_modules/obsidian/index.js
NODE_OPTIONS=--openssl-legacy-provider npx start-storybook -p 6006;