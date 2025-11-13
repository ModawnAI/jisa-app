# Quick Start - Dynamic Commission System v2.0

Get started in 3 minutes!

## ⚡ What's New?

- **95.9% smaller** (119 MB → 4.8 MB)
- **50-90% range** (was 50-70%)
- **6x faster loading**
- **Same interface** (drop-in replacement)

## 🚀 3-Step Setup

### Step 1: Install
```bash
cd commission_query_system_dynamic
npm install
```

### Step 2: Configure
```bash
# Edit config/.env
nano config/.env

# Add your key:
GEMINI_API_KEY=your-key-here
```

Get key: https://makersuite.google.com/app/apikey

### Step 3: Test
```bash
npm test
```

## 💡 Try It

### Example 1: Base (60%)
```bash
npm start
# Query: "약속플러스 60%"
# Result: Base commission rates
```

### Example 2: High (75%)
```bash
# Query: "약속플러스 75%"
# Result: ✅ Works! (v1.0: ❌ not supported)
# Multiplier: 1.25x
```

### Example 3: Maximum (90%)
```bash
# Query: "KB 종신보험 90%"
# Result: ✅ Works! (v1.0: ❌ not supported)
# Multiplier: 1.5x
```

## 📊 Formula

```
commission_at_X% = (commission_at_60% / 60) × X

Examples:
50%: base × 0.833
75%: base × 1.25
90%: base × 1.5
```

## ✅ You're Ready!

Now you can query **any percentage from 50-90%**!

Read `README.md` for full documentation.
