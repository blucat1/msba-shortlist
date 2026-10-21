#!/bin/zsh
set -e
cd "${0:A:h}"
if [[ -x "$PWD/.tools/node-v24.22.0-darwin-arm64/bin/node" ]]; then
  export PATH="$PWD/.tools/node-v24.22.0-darwin-arm64/bin:$PATH"
elif [[ -f "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use
fi
if ! command -v node >/dev/null; then
  print "Install Node 24 (see README.md), then run this launcher again."
  exit 1
fi
if [[ ! -d node_modules ]]; then npm ci; fi
print "Open http://localhost:5173/demo after Vite starts. Press Control-C to stop."
npm run dev
