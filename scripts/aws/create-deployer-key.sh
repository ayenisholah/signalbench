#!/usr/bin/env bash
# Creates an access key for the signalbench-github-deployer IAM user and stores
# it straight into the GitHub repo's Actions secrets, alongside the repo
# variables the deploy workflow reads. The secret never touches your terminal,
# clipboard or shell history.
#
# Needs: aws CLI (credentials for the SignalBench account), gh CLI (logged in), jq.
# Usage:  scripts/aws/create-deployer-key.sh [--rotate]
#   --rotate  delete the user's existing keys after the new one is stored
set -euo pipefail

REPO="${REPO:-ayenisholah/signalbench}"
REGION="${AWS_REGION:-eu-north-1}"
USER_NAME="signalbench-github-deployer"
APP_URL="${APP_URL:-https://signalbench.sholaayeni.xyz}"

for bin in aws gh jq; do command -v "$bin" >/dev/null || { echo "missing: $bin" >&2; exit 1; }; done

old_keys=$(aws iam list-access-keys --user-name "$USER_NAME" --query 'AccessKeyMetadata[].AccessKeyId' --output text)
if [[ -n "$old_keys" && "${1:-}" != "--rotate" ]]; then
  echo "$USER_NAME already has key(s): $old_keys. Re-run with --rotate to replace them." >&2
  exit 1
fi

key_json=$(aws iam create-access-key --user-name "$USER_NAME" --output json)
jq -r '.AccessKey.AccessKeyId' <<<"$key_json" | gh secret set AWS_ACCESS_KEY_ID --repo "$REPO"
jq -r '.AccessKey.SecretAccessKey' <<<"$key_json" | gh secret set AWS_SECRET_ACCESS_KEY --repo "$REPO"
unset key_json

gh variable set AWS_REGION --repo "$REPO" --body "$REGION"
gh variable set ECR_REPOSITORY --repo "$REPO" --body "signalbench/web"
gh variable set ECS_CLUSTER --repo "$REPO" --body "signalbench"
gh variable set ECS_SERVICE --repo "$REPO" --body "signalbench-web"
gh variable set APP_URL --repo "$REPO" --body "$APP_URL"

if [[ "${1:-}" == "--rotate" ]]; then
  for k in $old_keys; do aws iam delete-access-key --user-name "$USER_NAME" --access-key-id "$k"; echo "deleted old key $k"; done
fi

echo "Stored AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY secrets and deploy variables on $REPO."
