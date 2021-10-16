#!/bin/bash

files=("const.js" "util.js" "main.js" "entities.js" "stages.js" "listeners.js")
dir="src/"

cat page.js > backup.js

echo "// PACK.SH : $(date)" > page.js

echo "////////////////////////////////////////////////////////////////////////////////" >> page.js
for f in ${files[@]}; do
    file="${dir}${f}"
    cat $file >> page.js
    echo "////////////////////////////////////////////////////////////////////////////////" >> page.js
done
