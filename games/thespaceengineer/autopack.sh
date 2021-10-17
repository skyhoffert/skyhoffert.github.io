#!/bin/bash

inotifywait -q -m -e close_write -r src/ |
while read -r filename event; do
    ./pack.sh
done
