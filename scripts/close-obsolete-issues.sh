#!/usr/bin/env bash
# Close issues that were roadmap items already implemented in Plans A-D
set -euo pipefail

for i in 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37; do
  gh issue close "$i" --comment "Implemented as part of Plans A-D. Closing as obsolete." --reason completed
done

echo "Done — 15 obsolete issues closed."
