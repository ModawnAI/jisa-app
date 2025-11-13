#!/bin/bash
# Setup script for Dynamic Commission Query System v2.0

echo "=========================================="
echo "  Dynamic Commission Query System v2.0"
echo "  Setup Script"
echo "=========================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check .env
if [ ! -f "config/.env" ]; then
    echo ""
    echo "⚠️  config/.env not found!"

    if [ -f "config/.env.example" ]; then
        echo "Creating .env from example..."
        cp config/.env.example config/.env
        echo "✅ Created config/.env"
        echo ""
        echo "⚠️  IMPORTANT: Edit config/.env and add your GEMINI_API_KEY"
        echo "   Get key from: https://makersuite.google.com/app/apikey"
    fi
else
    echo "✅ config/.env found"
fi

# Check data files
echo ""
echo "📊 Checking data files..."

if [ ! -f "data/commission_data_base_60pct_only.json" ]; then
    echo "⚠️  Base data file not found"
else
    SIZE=$(du -h data/commission_data_base_60pct_only.json | cut -f1)
    echo "✅ Base data file found ($SIZE)"
fi

if [ ! -f "data/commission_metadata_index.json" ]; then
    echo "⚠️  Metadata index not found"
else
    SIZE=$(du -h data/commission_metadata_index.json | cut -f1)
    echo "✅ Metadata index found ($SIZE)"
fi

# Make scripts executable
echo ""
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh 2>/dev/null
chmod +x tests/*.js 2>/dev/null
echo "✅ Scripts ready"

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "🚀 What's New in v2.0:"
echo "   • 95.9% smaller data files (119MB → 4.8MB)"
echo "   • 95% more percentage options (50-70% → 50-90%)"
echo "   • 6x faster loading"
echo "   • 93% less memory usage"
echo ""
echo "Next steps:"
echo "  1. Edit config/.env and add GEMINI_API_KEY"
echo "  2. Run: npm test (test dynamic calculation)"
echo "  3. Run: npm test:range (test 50-90% range)"
echo "  4. Run: npm start (start the system)"
echo ""
