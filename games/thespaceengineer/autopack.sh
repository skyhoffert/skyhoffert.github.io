#!/bin/bash

while inotifywait -q src/ > /dev/null ; do
    echo -n "packed on "
    date
    ./pack.sh
done
