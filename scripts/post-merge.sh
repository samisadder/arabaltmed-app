#!/bin/bash
set -e

echo "Installing root dependencies..."
npm install --silent

echo "Installing server dependencies..."
npm install --prefix server --silent

echo "Installing client dependencies..."
npm install --prefix client --silent

echo "Running database migrations..."
npm run migrate --prefix server
