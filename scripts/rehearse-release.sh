#!/usr/bin/env bash
set -euo pipefail
family=${1:?family required}
case "$family" in martlet|krigsvold) ;; *) exit 2;; esac
src=$(pwd)
work=$(mktemp -d "${TMPDIR:-/tmp}/nightjar-react-rehearsal.XXXXXXXX")
trap 'rm -r "$work"' EXIT
mkdir "$work/source" "$work/archive" "$work/out"
git -C "$src" archive HEAD | tar -x -C "$work/source"
cd "$work/source"
node - <<'NODE'
const fs=require('fs');
const v='9999.0.0-nightjar.0';
for(const f of ['package.json','package-lock.json']) {const j=JSON.parse(fs.readFileSync(f));j.version=v;if(j.packages?.[''])j.packages[''].version=v;fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');}
fs.appendFileSync('CHANGELOG.md',`\n## ${v} — local rehearsal only\n`);
NODE
npm ci --ignore-scripts --no-audit --no-fund
npm test
git init -q -b main
git add .
git -c user.name='Nightjar rehearsal' -c user.email='nightjar-rehearsal@example.invalid' commit -qm rehearsal
git init -q --bare "$work/remote.git"
git remote add origin "$work/remote.git"
git tag v9999.0.0-nightjar.0
git push -q origin main refs/tags/v9999.0.0-nightjar.0
git fetch -q origin main:refs/remotes/origin/main
export RELEASE_TAG=v9999.0.0-nightjar.0 REF_PROTECTED=true RELEASE_ENVIRONMENT_READY=yes
export GITHUB_REPOSITORY="${family}design/react" GITHUB_SHA=$(git rev-parse HEAD)
export GITHUB_OUTPUT="$work/output" NODE_USE_ENV_PROXY=1
# The synthetic source is unpublished: validate its tag and absence without
# pretending it can complete a genuine published-source release.
node scripts/tag-release-cli.mjs verify-tag
node scripts/tag-release-cli.mjs confirm-absent
node --input-type=module -e 'import assert from "node:assert/strict"; import {releaseVersion} from "./scripts/tag-release-guard.mjs"; assert.equal(releaseVersion(process.env.RELEASE_TAG).channel,"next");'
if node scripts/tag-release-cli.mjs preflight >"$work/completion-negative.log" 2>&1; then
  echo "Unpublished fixture must not pass source completion" >&2; exit 1
fi
grep -Fq 'Error: Registry version must already be published: absent' "$work/completion-negative.log"
# Reject a known existing version using the same registry classifier.
node scripts/check-published.mjs
# Build an archive from the committed source; the private manifest changes only in the isolated copy.
git archive HEAD | tar -x -C "$work/archive"
node - "$work/archive/package.json" <<'NODE'
const fs=require('fs'), p=process.argv[2], j=JSON.parse(fs.readFileSync(p));
if(j.private!==true)process.exit(1);j.private=false;fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n');
NODE
rm -r "$work/source/node_modules"
(cd "$work/archive" && npm ci --ignore-scripts --no-audit --no-fund && npm run build:package && npm pack --ignore-scripts --pack-destination "$work/out" >/dev/null)
archive="$work/out/${family}-react-9999.0.0-nightjar.0.tgz"
node scripts/tag-release-cli.mjs inspect "$archive"
npm publish "$archive" --dry-run --registry http://127.0.0.1:9 --ignore-scripts --tag next --fetch-retries=0 >/dev/null
sha256sum "$archive"
echo "$family local nonpublishing rehearsal passed (tag protection simulated)"
