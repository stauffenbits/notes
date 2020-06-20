#!/bin/bash
rm docs/* -rf
parcel build index.html --out-dir='docs' --public-url='https://stauffenbits.github.io/notes/'
git add .
git commit -m "auto"
git push origin master