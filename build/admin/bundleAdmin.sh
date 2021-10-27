#!/usr/bin/env bash
# shellcheck disable=SC2059

set -o errexit
set -o nounset
set -o pipefail

TMP_DIR="$(mktemp -d)"
REPO_DIR=$TMP_DIR/owncast-admin
SRC_DIR=$(pwd)

shutdown () {
  rm -rf "$SRC_DIR/admin"
  rm -rf "$TMP_DIR"
}
trap shutdown INT TERM ABRT EXIT

echo "Cloning owncast admin into $TMP_DIR..."
git clone https://github.com/owncast/owncast-admin $REPO_DIR 2> /dev/null

echo "Installing npm modules for the owncast admin..."
(cd ${REPO_DIR}; npm --silent install 2> /dev/null)

echo "Building owncast admin..."
rm -rf ${REPO_DIR}/.next
(cd ${REPO_DIR}; node_modules/.bin/next build && node_modules/.bin/next export) | grep info

echo "Copying admin to project directory..."
rm -rf "${SRC_DIR}/admin"
cp -R ${REPO_DIR}/out ${SRC_DIR}/admin

echo "Bundling admin into owncast codebase..."
rm -rf "$SRC_DIR/pkged.go"
cd $SRC_DIR; ~/go/bin/pkger

shutdown
echo "Done."
