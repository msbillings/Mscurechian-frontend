#!/usr/bin/env python3
"""
🔥 AGGRESSIVE FRONTEND OPTIMIZATION SCRIPT
Automatically optimizes ALL hospital-admin pages for maximum speed
"""

import os
import re
from pathlib import Path

BASE_DIR = Path("/Users/apple/CureChainMain/frontend/cure-chain-frontend/app/hospital-admin")

def remove_animations(content):
    """Remove ALL animation classes"""
    # Remove all animate-* classes EXCEPT animate-spin (for loading)
    content = re.sub(r'animate-in\s+', '', content)
    content = re.sub(r'fade-in\s+', '', content)
    content = re.sub(r'slide-in-from-\w+-\d+\s+', '', content)
    content = re.sub(r'zoom-in-\d+\s+', '', content)
    content = re.sub(r'duration-\d+\s*', '', content)
    content = re.sub(r'animate-pulse', 'opacity-50', content)  # Replace pulse with static opacity
    content = re.sub(r'animate-ping', '', content)
    content = re.sub(r'animate-spin-reverse', '', content)
    
    # Simplify loading spinners
    content = re.sub(
        r'animate-spin rounded-full (h-\d+) (w-\d+) border-b-2 border-(\w+-\d+)',
        r'\1 \2 border-4 border-gray-200 border-t-\3 rounded-full spin',
        content
    )
    
    return content

def add_react_memo(content, filename):
    """Add React.memo() if not present"""
    # Check if already has React.memo
    if 'React.memo(' in content or '= React.memo' in content:
        return content
    
    # Find the component export
    export_match = re.search(r'export default function (\w+)\(', content)
    if export_match:
        component_name = export_match.group(1)
        # Change export default function to function + memo export
        content = re.sub(
            r'export default function ' + component_name,
            f'function {component_name}',
            content
        )
        
        # Add React.memo export at the end, before the last newline
        if not content.endswith('\n\n'):
            content = content.rstrip() + '\n'
        content = content + f'\n// ✅ OPTIMIZED: Memoized component\nexport default React.memo({component_name});\n'
    
    return content

def add_use_memo_import(content):
    """Ensure useMemo is imported"""
    # Check if useMemo is already imported
    if 'useMemo' in content:
        return content
    
    # Find React import and add useMemo
    content = re.sub(
        r"import React(?:,\s*\{([^}]+)\})? from ['\"]react['\"]",
        lambda m: f"import React, {{ {m.group(1) + ', ' if m.group(1) else ''}useMemo }} from 'react'",
        content
    )
    
    return content

def optimize_file(filepath):
    """Optimize a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 1. Remove animations
        content = remove_animations(content)
        
        # 2. Add useMemo import if needed
        content = add_use_memo_import(content)
        
        # 3. Add React.memo to component export
        content = add_react_memo(content, filepath.name)
        
        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Optimized: {filepath.relative_to(BASE_DIR)}")
            return True
        else:
            print(f"⏭️  Skipped (no changes): {filepath.relative_to(BASE_DIR)}")
            return False
    except Exception as e:
        print(f"❌ Error processing {filepath}: {e}")
        return False

def main():
    print("🚀 Starting aggressive optimization of hospital-admin dashboard...")
    print(f"📁 Base directory: {BASE_DIR}\n")
    
    # Find all .tsx files
    tsx_files = list(BASE_DIR.rglob("*.tsx"))
    
    optimized_count = 0
    skipped_count = 0
    
    for tsx_file in tsx_files:
        if optimize_file(tsx_file):
            optimized_count += 1
        else:
            skipped_count += 1
    
    print(f"\n✨ Optimization complete!")
    print(f"✅ Optimized: {optimized_count} files")
    print(f"⏭️  Skipped: {skipped_count} files")
    print(f"📊 Total: {len(tsx_files)} files")
    print("\n🎯 Next: Restart dev server to see changes!")

if __name__ == "__main__":
    main()
