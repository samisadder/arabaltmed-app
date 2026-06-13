#!/bin/bash
set -e

echo "Installing server dependencies..."
npm install --prefix server --silent

echo "Installing client dependencies..."
npm install --prefix client --silent

echo "Starting services..."
exec npm run dev
