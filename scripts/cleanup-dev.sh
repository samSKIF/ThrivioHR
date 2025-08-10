#!/bin/bash
set -e

echo "Cleaning development artifacts..."

# Remove common build/cache directories (avoiding system directories)
rm -rf .nx/cache || true
rm -rf dist/ || true
rm -rf build/ || true
rm -rf coverage/ || true
rm -rf .turbo/ || true
rm -rf .next/ || true
rm -rf .expo/ || true
rm -rf playwright-report/ || true
rm -rf test-results/ || true
rm -rf tmp/ || true
rm -rf uploads/ || true

echo "Development cleanup complete."