#!/usr/bin/env node
/**
 * Natural Language Query System for Commission Data - DYNAMIC VERSION
 * Uses base 60% data and calculates other percentages on-the-fly
 * Supports 50-90% range (95.9% smaller data file!)
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

// Data files (NEW: smaller base-only file)
const BASE_COMMISSION_DATA_PATH = path.join(__dirname, '../data/commission_data_base_60pct_only.json');
const METADATA_INDEX_PATH = path.join(__dirname, '../data/commission_metadata_index.json');

class GeminiQueryParser {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!this.apiKey) {
      console.log('⚠️  GEMINI_API_KEY not set. Using rule-based parsing.');
      this.useGemini = false;
      return;
    }

    try {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      this.model = 'gemini-flash-latest';
      this.useGemini = true;
      console.log('✅ Gemini API initialized (model: gemini-flash-latest)');
    } catch (error) {
      console.log(`⚠️  Gemini initialization failed: ${error.message}`);
      this.useGemini = false;
    }
  }

  async parseWithGemini(query, metadataSample) {
    if (!this.useGemini) {
      return this._ruleBasedParse(query);
    }

    // Build comprehensive prompt with metadata
    const prompt = `You are an expert Korean insurance commission data query parser.

AVAILABLE DATA CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 DATABASE OVERVIEW:
- Total Products: ${metadataSample.total_products}
- Companies: ${metadataSample.companies.length}
- Available Percentages: Any percentage from 1% to 200% (dynamic calculation from 60% base)

🏢 COMPANIES (13 total):
${JSON.stringify(metadataSample.companies, null, 2)}

📋 COMMON PAYMENT PERIODS:
${metadataSample.common_payment_periods.slice(0, 10).join(', ')}

🔑 TOP PRODUCT KEYWORDS:
${metadataSample.top_keywords.slice(0, 15).join(', ')}

📦 PRODUCT TYPES:
${metadataSample.product_types.join(', ')}

💼 SAMPLE PRODUCTS BY COMPANY:
${JSON.stringify(metadataSample.sample_products_by_company, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER QUERY: "${query}"

Parse this query and extract structured information. Return ONLY valid JSON with NO markdown, NO code blocks, NO explanations:

{
  "product_keywords": ["keyword1", "keyword2"],
  "payment_period": "5년납",
  "percentage": 60,
  "company_hint": "KB",
  "query_type": "commission_lookup",
  "confidence": 0.95,
  "reasoning": "brief explanation"
}

EXTRACTION RULES:
1. product_keywords: Key words from product name in Korean (e.g., ["약속플러스", "종신보험"])
2. payment_period: Exact payment term (5년납, 10년납, 전기납, 일시납, null)
3. percentage: Any integer 1-200 (null if not specified) - System supports dynamic calculation at any percentage
4. company_hint: Company name if mentioned (KB, 삼성, 미래에셋, etc.)
5. query_type: Always "commission_lookup"
6. confidence: 0.0-1.0 based on clarity
7. reasoning: Why you chose these extractions

IMPORTANT: Return ONLY the JSON object, no other text.`;

    try {
      const contents = [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const config = {
        thinkingConfig: {
          thinkingBudget: -1,
        }
      };

      const response = await this.ai.models.generateContentStream({
        model: this.model,
        config,
        contents
      });

      let fullText = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
        }
      }

      // Extract JSON from response
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        parsed.parsed_by = 'gemini';
        return parsed;
      }

      console.log('⚠️  Could not parse Gemini response, using rule-based');
      return this._ruleBasedParse(query);

    } catch (error) {
      console.log(`⚠️  Gemini error: ${error.message}, using rule-based`);
      return this._ruleBasedParse(query);
    }
  }

  _ruleBasedParse(query) {
    const result = {
      product_keywords: [],
      payment_period: null,
      percentage: null,
      company_hint: null,
      query_type: 'commission_lookup',
      confidence: 0.6,
      parsed_by: 'rule_based'
    };

    // Extract percentage (any positive integer)
    const pctMatch = query.match(/(\d+)\s*[%프]/);
    if (pctMatch) {
      const pct = parseInt(pctMatch[1]);
      if (pct >= 1 && pct <= 200) {  // Support 1-200%
        result.percentage = pct;
      }
    }

    // Extract payment period
    const periodMatch = query.match(/(\d+년납|일시납|전기납|평생납)/);
    if (periodMatch) {
      result.payment_period = periodMatch[1];
    }

    // Simple keyword extraction
    const words = query.replace(/[%프\d년납일시전기평생]/g, ' ').trim().split(/\s+/);
    result.product_keywords = words.filter(w => w.length > 1);

    return result;
  }
}

class NaturalLanguageCommissionSystem {
  constructor() {
    console.log('📂 Loading base data...');

    // Load BASE commission data (60% only)
    this.baseCommissionData = JSON.parse(
      fs.readFileSync(BASE_COMMISSION_DATA_PATH, 'utf-8')
    );

    // Load metadata index
    this.index = JSON.parse(
      fs.readFileSync(METADATA_INDEX_PATH, 'utf-8')
    );

    console.log(`✅ Loaded ${this.index.metadata.total_products} products from ${this.index.metadata.total_companies} companies`);
    console.log(`📊 Base data size: ${(fs.statSync(BASE_COMMISSION_DATA_PATH).size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`🎯 Supported range: 50-90% (calculated on-the-fly)`);

    // Initialize parser
    this.parser = new GeminiQueryParser();
  }

  /**
   * DYNAMIC COMMISSION CALCULATION
   * Calculate commission for ANY percentage from base 60% data
   * Formula: commission_at_X% = (commission_at_60% / 60) * X
   */
  calculateCommissionAtPercentage(baseRates, targetPercentage, basePercentage = 60) {
    const multiplier = targetPercentage / basePercentage;
    const calculatedRates = {};

    for (const [key, baseValue] of Object.entries(baseRates)) {
      calculatedRates[key] = baseValue * multiplier;
    }

    return {
      calculated_rates: calculatedRates,
      multiplier,
      base_percentage: basePercentage,
      target_percentage: targetPercentage,
      formula: `${targetPercentage}% = (60% × ${multiplier.toFixed(6)})`
    };
  }

  getCommissionData(company, rowNumber, percentage) {
    const companyData = this.baseCommissionData.companies[company];

    if (!companyData) {
      return { error: `Company '${company}' not found` };
    }

    // Validate percentage range (1-200%)
    if (percentage < 1 || percentage > 200) {
      return { error: `Percentage ${percentage}% not in range (1%-200%)` };
    }

    // Find product by row number
    const product = companyData.products.find(p => p.row_number === rowNumber);

    if (!product) {
      return { error: `Product not found at row ${rowNumber}` };
    }

    // CALCULATE commission rates on-the-fly
    const baseRates = product.base_commission_rates;
    const calculation = this.calculateCommissionAtPercentage(baseRates, percentage);

    return {
      company,
      percentage,
      multiplier_ratio: calculation.multiplier,
      calculation_formula: calculation.formula,
      product: {
        row_number: product.row_number,
        metadata: product.metadata,
        commission_rates: calculation.calculated_rates  // Dynamically calculated!
      }
    };
  }

  // ... (rest of the methods stay the same)
  // Copying from original nl_query_system.js
  fuzzyMatchProduct(keywords, paymentPeriod = null, companyHint = null) {
    const candidates = [];

    for (const product of this.index.products) {
      let score = 0;
      const productName = product.product_name_normalized;
      const productPeriod = product.payment_period_normalized;

      // Keyword matching
      for (const keyword of keywords) {
        const keywordNorm = keyword.toLowerCase().replace(/\s/g, '');

        // Exact match in product name
        if (productName.includes(keywordNorm)) {
          score += 1.0;
        }

        // Fuzzy match
        const similarity = this._stringSimilarity(keywordNorm, productName);
        score += similarity * 0.5;

        // Keyword list match
        if (product.keywords.includes(keywordNorm)) {
          score += 0.8;
        }
      }

      // Payment period match
      if (paymentPeriod && productPeriod) {
        const periodNorm = paymentPeriod.toLowerCase().replace(/\s/g, '');
        if (productPeriod.includes(periodNorm)) {
          score += 2.0;
        }
      }

      // Company hint match
      if (companyHint && product.company.includes(companyHint)) {
        score += 1.5;
      }

      if (score > 0) {
        candidates.push({
          ...product,
          match_score: score
        });
      }
    }

    return candidates.sort((a, b) => b.match_score - a.match_score);
  }

  _stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this._levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  _levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  getMetadataSample() {
    // Sample products from each company
    const companySamples = {};
    for (const [companyName, companyInfo] of Object.entries(this.index.companies).slice(0, 5)) {
      const products = this.index.products.filter(p => p.company === companyName);
      companySamples[companyName] = products.slice(0, 3).map(p => ({
        name: p.product_name.substring(0, 60),
        period: p.payment_period,
        keywords: p.keywords.slice(0, 3)
      }));
    }

    // Top payment periods
    const periodCounts = {};
    this.index.products.forEach(p => {
      periodCounts[p.payment_period] = (periodCounts[p.payment_period] || 0) + 1;
    });
    const topPeriods = Object.entries(periodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([period]) => period);

    // Top keywords
    const keywordCounts = {};
    this.index.products.forEach(p => {
      p.keywords.forEach(kw => {
        keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
      });
    });
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([kw]) => kw);

    // Product types
    const types = [...new Set(this.index.products.map(p => {
      const name = p.product_name;
      if (name.includes('종신')) return '종신보험';
      if (name.includes('변액')) return '변액연금';
      if (name.includes('건강')) return '건강보험';
      if (name.includes('실손')) return '실손보험';
      if (name.includes('암')) return '암보험';
      return null;
    }).filter(Boolean))].slice(0, 10);

    return {
      companies: Object.keys(this.index.companies),
      total_products: this.index.metadata.total_products,
      common_payment_periods: topPeriods,
      top_keywords: topKeywords,
      product_types: types,
      sample_products_by_company: companySamples
    };
  }

  async executeQuery(query) {
    console.log('\n' + '='.repeat(80));
    console.log(`🔍 Query: ${query}`);
    console.log('='.repeat(80));

    // Parse with Gemini
    console.log('\n📝 Step 1: Parsing with Gemini...');
    const metadataSample = this.getMetadataSample();
    const parsed = await this.parser.parseWithGemini(query, metadataSample);

    console.log(`   Parsed by: ${parsed.parsed_by}`);
    console.log(`   Keywords: ${JSON.stringify(parsed.product_keywords)}`);
    console.log(`   Payment Period: ${parsed.payment_period}`);
    console.log(`   Percentage: ${parsed.percentage}%`);
    console.log(`   Company: ${parsed.company_hint}`);
    console.log(`   Confidence: ${parsed.confidence.toFixed(2)}`);
    if (parsed.reasoning) {
      console.log(`   Reasoning: ${parsed.reasoning}`);
    }

    // Search products
    console.log('\n🔎 Step 2: Fuzzy matching products...');
    const matches = this.fuzzyMatchProduct(
      parsed.product_keywords,
      parsed.payment_period,
      parsed.company_hint
    );

    if (matches.length === 0) {
      return {
        status: 'error',
        message: 'No matching products found',
        parsed_query: parsed
      };
    }

    console.log(`   Found ${matches.length} matches`);

    // Top matches
    const topMatches = matches.slice(0, 5);
    console.log('\n📊 Top matches:');
    topMatches.forEach((match, i) => {
      const name = match.product_name.slice(0, 60) + '...';
      console.log(`   ${i + 1}. ${name}`);
      console.log(`      ${match.company} | ${match.payment_period} | Score: ${match.match_score}`);
    });

    // Get commission data (DYNAMIC CALCULATION!)
    const bestMatch = topMatches[0];
    const percentage = parsed.percentage || 60;

    console.log(`\n💰 Step 3: Calculating commission at ${percentage}%...`);

    const commissionResult = this.getCommissionData(
      bestMatch.company,
      bestMatch.row_number,
      percentage
    );

    return {
      status: 'success',
      query,
      parsed_query: parsed,
      best_match: {
        product_name: bestMatch.product_name,
        company: bestMatch.company,
        payment_period: bestMatch.payment_period,
        match_score: bestMatch.match_score,
        metadata: bestMatch.metadata
      },
      fuzzy_matches: topMatches,
      alternatives: topMatches.slice(1, 4).map(m => ({
        product_name: m.product_name,
        company: m.company,
        payment_period: m.payment_period,
        match_score: m.match_score
      })),
      commission_data: commissionResult,
      percentage
    };
  }

  formatResult(result) {
    if (result.status === 'error') {
      return `\n❌ ${result.message}\n`;
    }

    const lines = ['\n' + '='.repeat(80), '✅ COMMISSION QUERY RESULT', '='.repeat(80)];

    const best = result.best_match;
    lines.push(`\n🎯 Best Match (score: ${best.match_score}):`);
    lines.push(`   ${best.product_name}`);
    lines.push(`   Company: ${best.company}`);
    lines.push(`   Payment: ${best.payment_period}`);

    const comm = result.commission_data;
    if (!comm.error) {
      lines.push(`\n💰 Commission at ${result.percentage}%:`);
      lines.push(`   Multiplier: ${comm.multiplier_ratio.toFixed(6)}x`);
      lines.push(`   Formula: ${comm.calculation_formula}`);

      const rates = comm.product.commission_rates || {};
      const rateEntries = Object.entries(rates).slice(0, 8);

      lines.push('\n   Commission Rates:');
      for (const [key, value] of rateEntries) {
        lines.push(`      • ${key}: ${value.toFixed(5)}`);
      }

      if (Object.keys(rates).length > 8) {
        lines.push(`      ... +${Object.keys(rates).length - 8} more`);
      }
    } else {
      lines.push(`\n⚠️  Commission Data: ${comm.error}`);
      lines.push(`   Default percentage (60%) will be used if not specified`);
    }

    if (result.alternatives.length > 0) {
      lines.push('\n🔍 Other Matches:');
      result.alternatives.forEach((alt, i) => {
        const name = alt.product_name.slice(0, 55) + '...';
        lines.push(`   ${i + 1}. ${name}`);
        lines.push(`      ${alt.company} | ${alt.payment_period} (score: ${alt.match_score})`);
      });
    }

    lines.push('\n' + '='.repeat(80) + '\n');

    return lines.join('\n');
  }
}

// Export the main class
export { NaturalLanguageCommissionSystem, GeminiQueryParser };

// If running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  async function main() {
    console.log('='.repeat(80));
    console.log(' 💬 DYNAMIC COMMISSION QUERY SYSTEM (50-90% Range)');
    console.log('='.repeat(80));

    const system = new NaturalLanguageCommissionSystem();

    // Test queries with expanded range
    const queries = [
      '약속플러스 5년납 60%',
      '약속플러스 75%',  // NEW: Beyond old 70% limit
      'KB 종신보험 85%',  // NEW: High percentage
      '삼성 변액연금 50%'  // Edge case: minimum
    ];

    for (const query of queries) {
      const result = await system.executeQuery(query);
      console.log(system.formatResult(result));

      // Pause between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  main().catch(console.error);
}
