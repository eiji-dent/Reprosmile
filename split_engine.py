import os

filepath = 'js/analysis/SimulationEngine.js'
with open(filepath, 'r') as f:
    lines = f.readlines()

out_dir = 'js/analysis/simulation'
os.makedirs(out_dir, exist_ok=True)

sections = []
current_section = {"name": "HEADER", "lines": []}
sections.append(current_section)

for line in lines:
    if "    // ---------------------------------------------------------------" in line:
        parts = line.split('--- ')
        if len(parts) > 1:
            name = parts[1].strip()
            current_section = {"name": name, "lines": [line]}
            sections.append(current_section)
        else:
            current_section["lines"].append(line)
    else:
        current_section["lines"].append(line)

# Let's map sections to files
file_maps = {
    'SimulationEngine.js': ['STATE', 'INIT', 'MODE CONTROL', 'RESET', 'UI UPDATE', 'EXPORT'],
    'SimulationRenderer.js': ['RESIZE', 'DRAW BG', 'GAME LOOP'],
    'SimulationInteraction.js': ['HIT TESTING', 'EVENT LISTENERS'],
    'SimulationAI.js': ['EXTRACTION', 'AI SEGMENTATION']
}

def get_section_lines(name):
    for sec in sections:
        if sec["name"] == name:
            return sec["lines"]
    return []

def format_mixin(lines_list):
    # Just join them. The trailing comma from the last method in the section will be there.
    out = ""
    for lines in lines_list:
        out += "".join(lines)
    
    # We want to make sure it doesn't end abruptly without a comma between sections.
    # Actually, if we just assign the block into an object, the trailing comma of the original JS is enough.
    return out

for fname, sec_names in file_maps.items():
    out_path = os.path.join(out_dir, fname)
    with open(out_path, 'w') as f:
        if fname == 'SimulationEngine.js':
            f.write("".join(get_section_lines("HEADER")))
            for name in sec_names:
                f.write("".join(get_section_lines(name)))
            
            # The EXPORT section includes the closing bracket of the window.SimulationEngine = { ... };
            # If the last section doesn't include the closing bracket, we need to add it, but 'EXPORT' does.
            # Wait, 'EXPORT' includes:
            # 1089: };
            # 1090: 
            # 1091: // Auto-init removed. app.js handles init().
            # So EXPORT section inherently has the closing bracket.
        else:
            f.write(f"/**\n * {fname}\n * Mixin for SimulationEngine\n */\n")
            f.write("Object.assign(window.SimulationEngine, {\n\n")
            for name in sec_names:
                content = "".join(get_section_lines(name))
                # remove any leading closing brace if it accidentally caught one? No, the headers are cleanly placed.
                # Just write it.
                f.write(content)
                # Ensure trailing comma just in case, but let's just write a comma anyway
                f.write(",\n\n")
            f.write("\n});\n")

print("Splitting complete.")
