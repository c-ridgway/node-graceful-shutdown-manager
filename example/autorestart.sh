#!/bin/bash

i=1;
while [[ $i == 1 || -f ".restart" ]]; do
  if [[ -f ".restart" ]]; then
    clear;
    echo Restarted: $i;
    rm ".restart";
  fi

  node index.js $@;

  let i=i+1;
done