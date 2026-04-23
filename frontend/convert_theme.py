import os
import re

files_to_convert = [
    "src/portal/pages/UserRegister.tsx",
    "src/portal/pages/UserShell.tsx"
]

replacements = [
    (r'bg-\[\#030712\]', 'bg-[#f8fafc] italic'),
    (r'text-slate-300', 'text-slate-900'),
    (r'bg-slate-900/40 backdrop-blur-2xl border-white/10', 'bg-white border-slate-200 shadow-xl'),
    (r'bg-slate-900/40', 'bg-white'),
    (r'text-white', 'text-slate-900 font-black'),
    (r'bg-black/20 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner', 'bg-slate-50 border border-slate-100 px-6 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-600 shadow-inner transition-all font-bold text-[11px] uppercase tracking-wider'),
    (r'bg-black/20', 'bg-slate-50'),
    (r'border-white/10', 'border-slate-100'),
    (r'placeholder-slate-500', 'placeholder-slate-300'),
    (r'text-cyan-400', 'text-blue-600'),
    (r'bg-cyan-500/10', 'bg-blue-50'),
    (r'border-cyan-500/20', 'border-blue-200'),
    (r'focus:border-cyan-500/50', 'focus:border-blue-600'),
    (r'focus:ring-cyan-500/50', 'focus:ring-blue-600'),
    (r'bg-cyan-500', 'bg-blue-600'),
    (r'from-indigo-500 to-cyan-500', 'from-blue-600 to-blue-700'),
    (r'from-indigo-400 hover:to-cyan-400', 'from-blue-500 hover:to-blue-600'),
    (r'text-slate-400', 'text-slate-400 font-bold uppercase tracking-widest text-[10px]'),
    (r'border-white/5', 'border-slate-100'),
    (r'bg-white/5', 'bg-slate-50'),
    (r'bg-white/10', 'bg-slate-100'),
    (r'shadow-\[0_0_15px_rgba\(34,211,238,0\.2\)\]', 'shadow-md'),
    (r'shadow-\[0_0_20px_rgba\(34,211,238,0\.2\)\]', 'shadow-md'),
    (r'drop-shadow-\[0_0_10px_rgba\(34,211,238,0\.5\)\]', 'shadow-sm'),
    (r'bg-gradient-to-br from-indigo-500/20 to-cyan-500/20', 'bg-blue-50'),
    (r'bg-gradient-to-t from-cyan-500/20 to-transparent', 'bg-blue-500/5'),
    (r'text-slate-500', 'text-slate-500 font-bold'),
]

for file_path in files_to_convert:
    with open(file_path, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        content = re.sub(old, new, content)
        
    with open(file_path, 'w') as f:
        f.write(content)

