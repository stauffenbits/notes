#!/bin/bash
sudo rm /var/www/html/notes/* -rf && sudo /home/thwee/bin/parcel build index.html --out-dir='/var/www/html/notes/' --public-url='http://localhost/notes/'