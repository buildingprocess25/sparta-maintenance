import re

filepath = "app/reports/[reportNumber]/report-detail-view.tsx"
with open(filepath, "r") as f:
    content = f.read()

idx = content.find("pendingEstimationLabel")
if idx == -1:
    print("NOT FOUND")
else:
    print(f"Found at char {idx}")
    # Show surrounding text as repr to see exact whitespace
    chunk = content[idx-200:idx+100]
    print(repr(chunk))
