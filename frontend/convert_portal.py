import glob
import re

files = glob.glob('src/portal/pages/admin/*.tsx') + glob.glob('src/portal/pages/user/*.tsx')

replacements = [
    (r'bg-\[\#0d1225\]', 'bg-white shadow-sm'),
    (r'bg-\[\#0a0f1e\]', 'bg-slate-50'),
    (r'border-gray-800/50', 'border-slate-200'),
    (r'border-gray-800', 'border-slate-200'),
    (r'text-white', 'text-slate-900'),
    (r'text-gray-400', 'text-slate-500'),
    (r'text-gray-500', 'text-slate-400'),
    (r'text-gray-300', 'text-slate-600'),
    (r'text-gray-600', 'text-slate-400'),
    (r'bg-gray-800/30', 'bg-slate-50'),
    (r'bg-gray-800', 'bg-slate-100'),
    (r'bg-gray-900', 'bg-slate-50'),
    (r'bg-black/20', 'bg-slate-50'),
    (r'border-white/10', 'border-slate-200'),
    (r'hover:bg-gray-800/50', 'hover:bg-slate-50'),
    (r'hover:bg-gray-800/30', 'hover:bg-slate-50'),
    (r'hover:bg-gray-800', 'hover:bg-slate-50'),
    (r'bg-gradient-to-r from-cyan-600/10 to-indigo-600/10', 'bg-blue-50'),
    (r'border-cyan-500/10', 'border-blue-100'),
    (r'bg-cyan-500/20', 'bg-blue-100'),
    (r'bg-cyan-500/10', 'bg-blue-50'),
    (r'text-cyan-400', 'text-blue-600'),
    (r'border-cyan-500/30', 'border-blue-200'),
    (r'hover:text-cyan-300', 'hover:text-blue-500'),
    (r'hover:border-cyan-500/50', 'hover:border-blue-300'),
    (r'text-yellow-400', 'text-amber-500'),
    (r'text-green-400', 'text-emerald-600'),
    (r'text-red-400', 'text-red-600'),
    (r'bg-red-500/20', 'bg-red-50'),
    (r'bg-red-500/10', 'bg-red-50'),
    (r'border-red-500/30', 'border-red-200'),
    (r'bg-green-500/10', 'bg-emerald-50'),
    (r'border-green-500/20', 'border-emerald-200'),
    (r'bg-yellow-500/10', 'bg-amber-50'),
    (r'border-yellow-500/20', 'border-amber-200'),
]

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = re.sub(old, new, content)
    with open(file_path, 'w') as f:
        f.write(content)

print(f"Converted {len(files)} files.")
