#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Downloading Linux Tectonic compiler..."
# Download the statically compiled musl Linux build of Tectonic
curl -Lo tectonic.tar.gz https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.16.9/tectonic-0.16.9-x86_64-unknown-linux-musl.tar.gz

echo "Extracting compiler binary..."
tar -xzf tectonic.tar.gz

echo "Setting permissions..."
chmod +x tectonic

# Clean up archive
rm tectonic.tar.gz

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Build script completed successfully!"
