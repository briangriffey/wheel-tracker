#!/bin/bash

# Lighthouse Performance Audit Script
# Runs Lighthouse on key pages and saves reports

BASE_URL="http://localhost:3000"
OUTPUT_DIR="./lighthouse-reports"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "🔍 Running Lighthouse audits..."
echo "Base URL: $BASE_URL"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Pages to audit
declare -a pages=(
  "/:home"
  "/design-system:design-system"
  "/design-system-test:design-system-test"
  "/dashboard:dashboard"
)

# Run Lighthouse for each page
for page in "${pages[@]}"; do
  IFS=':' read -r path name <<< "$page"
  echo "📊 Auditing: $path"

  npx lighthouse "$BASE_URL$path" \
    --output html \
    --output json \
    --output-path "$OUTPUT_DIR/$name" \
    --only-categories=performance \
    --chrome-flags="--headless --no-sandbox --disable-gpu" \
    --quiet

  if [ $? -eq 0 ]; then
    echo "✅ Completed: $name"
  else
    echo "❌ Failed: $name"
  fi
  echo ""
done

echo "🎉 All audits complete!"
echo "Reports saved to: $OUTPUT_DIR"
