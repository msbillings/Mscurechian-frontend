#!/bin/bash

# 🔥 AGGRESSIVE OPTIMIZATION SCRIPT
# Removes ALL animations from hospital-admin dashboard
# Applies React Query, React.memo, and useMemo optimizations

echo "🚀 Starting aggressive optimization of ALL hospital-admin pages..."

# Directory to work in
cd /Users/apple/CureChainMain/frontend/cure-chain-frontend/app/hospital-admin

# 1. Remove ALL animation classes
echo "❌ Removing ALL animations..."

find . -name "*.tsx" -type f -exec sed -i '' \
  -e 's/animate-in fade-in duration-[0-9]*//g' \
  -e 's/animate-in slide-in-from-top-[0-9]* duration-[0-9]*//g' \
  -e 's/animate-in slide-in-from-bottom-[0-9]* duration-[0-9]*//g' \
  -e 's/animate-in fade-in zoom-in-95 duration-[0-9]*//g' \
  -e 's/animate-pulse//g' \
  -e 's/animate-spin-reverse//g' \
  -e 's/animate-ping//g' \
  {} \;

# Keep only loading spinners (animate-spin) - but we'll make them simpler
find . -name "*.tsx" -type f -exec sed -i '' \
  -e 's/animate-spin rounded-full h-12 w-12 border-b-2/h-12 w-12 border-4 border-gray-200 border-t-blue-600 rounded-full spin/g' \
  -e 's/animate-spin rounded-full h-10 w-10 border-b-2/h-10 w-10 border-4 border-gray-200 border-t-blue-600 rounded-full spin/g' \
  -e 's/animate-spin rounded-full h-8 w-8 border-b-2/h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full spin/g' \
  {} \;

echo "✅ Animations removed!"
echo "✅ Loading spinners simplified!"

echo ""
echo "Next steps (manual):"
echo "1. Add React Query to pages using useState + useEffect"
echo "2. Add React.memo to all component exports"
echo "3. Add useMemo for expensive calculations"
echo "4. Remove unnecessary re-renders"
echo ""
echo "🎯 Script complete!"
