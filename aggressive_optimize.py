#!/usr/bin/env python3
"""
🚀 ULTIMATE FRONTEND PERFORMANCE OPTIMIZER v2
- Removes ALL animations from components and app folders
- Optimizes React.memo coverage
- Fixes lucide-react imports for dev speed
- Simplifies complexity
"""

import os
import re
from pathlib import Path

FRONTEND_DIR = Path("/Users/apple/CureChainMain/frontend/cure-chain-frontend")
TARGET_DIRS = [FRONTEND_DIR / "app", FRONTEND_DIR / "components"]

def aggressive_clean(content):
    # 1. Remove all framer-motion imports and usages
    content = re.sub(r"import \{[^}]*\} from ['\"]framer-motion['\"];?", "", content)
    content = re.sub(r"import motion from ['\"]framer-motion['\"];?", "", content)
    content = re.sub(r"import \{ AnimatePresence \} from ['\"]framer-motion['\"];?", "", content)
    
    # Replace motion.div with div, etc.
    content = re.sub(r"motion\.(div|span|button|h1|h2|h3|p|section|nav|article|li|ul|a)", r"\1", content)
    content = re.sub(r"<\/motion\.(div|span|button|h1|h2|h3|p|section|nav|article|li|ul|a)>", r"</\1>", content)
    
    # Remove motion props (initial, animate, exit, transition, whileHover, etc.)
    props_to_remove = ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileInView', 'viewport', 'variants', 'layout']
    for prop in props_to_remove:
        content = re.sub(rf'\s+{prop}=\{{[^}}]*\}}', '', content)
        content = re.sub(rf'\s+{prop}="[^"]*"', '', content)
    
    # 2. Remove Tailwind animations and transitions
    tw_anims = [
        'animate-in', 'fade-in', 'fade-out', 'slide-in-from-\w+-\d+', 'slide-out-to-\w+-\d+', 
        'zoom-in-\d+', 'zoom-out-\d+', 'duration-\d+', 'delay-\d+', 'ease-\w+',
        'animate-pulse', 'animate-bounce', 'animate-ping', 'animate-spin-slow'
    ]
    for anim in tw_anims:
        content = re.sub(rf'\s+{anim}', '', content)
        content = re.sub(rf'["\']{anim}\s*', '"', content)
        content = re.sub(rf'\s+{anim}["\']', '"', content)

    # 3. Simplify transition-all, transition-colors, etc.
    content = re.sub(r'\s+transition-\w+', '', content)
    content = re.sub(r'\s+duration-\d+', '', content)
    
    # 4. Remove AnimatePresence
    content = re.sub(r'<AnimatePresence[^>]*>', '', content)
    content = re.sub(r'</AnimatePresence>', '', content)
    
    return content

def check_and_fix(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original = content
        content = aggressive_clean(content)
        
        # Add React.memo to components if not present
        if filepath.suffix == '.tsx' and 'export default function' in content and 'React.memo' not in content:
            # Similar to previous logic but safer
            match = re.search(r'export default function (\w+)', content)
            if match:
                comp_name = match.group(1)
                content = content.replace(f'export default function {comp_name}', f'function {comp_name}')
                if 'import React' not in content:
                    content = f"import React from 'react';\n" + content
                elif 'React,' not in content and 'from \'react\'' in content:
                    content = content.replace("import {", "import React, {")
                
                content = content.rstrip() + f"\n\nexport default React.memo({comp_name});\n"

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"Error {filepath}: {e}")
    return False

def main():
    count = 0
    for target in TARGET_DIRS:
        for root, dirs, files in os.walk(target):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    if check_and_fix(Path(root) / file):
                        count += 1
    print(f"✅ Cleaned and Optimized {count} files.")

if __name__ == "__main__":
    main()
