# 🤖 AI-Powered CSS Fixes Setup Guide

## 🚀 Quick Setup (2 minutes)

### Step 1: Get Your Free Groq API Key

1. 🌐 Visit [Groq Console](https://console.groq.com/)
2. 📝 Sign up for a free account (no credit card required)
3. 🔑 Create a new API key
4. 📋 Copy your API key

### Step 2: Configure Your Environment

```bash
# Copy the example configuration
cp .env.example .env

# Edit .env file and add your API key
GROQ_API_KEY=your_actual_api_key_here
```

### Step 3: Test the AI Integration

```bash
# Run the optimizer with AI fixes
npm run optimize
```

That's it! You should see AI fixes being applied to complex CSS issues.

## 🎯 What AI Fixes

### ✅ Complex Issues AI Handles

- **Shorthand Property Overrides**: `background-color: red; background: blue;` → Proper ordering
- **Unknown Property Values**: `padding-top: 10` → `padding-top: 10px`
- **Deprecated Keywords**: Context-aware modern replacements
- **Structural Issues**: Problems that regex can't safely fix

### ⚡ What Regex Handles (No AI needed)

- Simple typos (`36xp` → `36px`)
- Deprecated properties (`word-break: break-word`)
- Basic invalid values (`align-items: anchor-center`)

## 🔧 Configuration Options

### Basic Configuration

```bash
# Enable/disable AI fixes
ENABLE_AI_FIXES=true

# Limit AI processing (cost control)
AI_MAX_ERRORS_TO_PROCESS=5

# AI creativity level (0.1 = very precise)
AI_TEMPERATURE=0.1
```

### Advanced Configuration

```bash
# Custom Groq model (optional)
GROQ_MODEL=llama3-70b-8192

# Response limits
AI_MAX_TOKENS_PER_REQUEST=1000

# Processing timeouts
AI_TIMEOUT_MS=10000
```

## 🔍 Troubleshooting

### No AI Fixes Applied?

```bash
# Check if API key is set
echo $GROQ_API_KEY

# Verify .env file exists
cat .env

# Test API connectivity
curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models
```

### Common Issues

#### ❌ "API key not set"

```bash
# Solution: Check your .env file
GROQ_API_KEY=gsk_your_actual_key_here  # Remove any quotes or spaces
```

#### ❌ "503 Service Unavailable"

```bash
# Solution: Groq API is temporarily down
# The optimizer will continue with regex-only fixes
# Check status: https://groqstatus.com/
```

#### ❌ "Request timeout"

```bash
# Solution: Increase timeout in .env
AI_TIMEOUT_MS=15000
```

## 💰 Cost Information

### Groq API Pricing (Free Tier)

- **Free Requests**: Generous daily limits
- **Model Used**: Llama 3.1 70B (most advanced)
- **Typical Usage**: 5-10 API calls per CSS file
- **Cost Optimization**: Only processes complex errors

### Cost Control Features

- **Error Limiting**: Process only N most complex errors
- **Context Optimization**: Send minimal CSS context
- **Smart Fallback**: Works perfectly without AI
- **Usage Tracking**: Monitor API calls in Groq console

## 🎨 Example Output

When AI fixes are working, you'll see:

```
🤖 Applying AI-powered CSS fixes...
   ✓ AI fixed declaration-block-no-shorthand-property-overrides at line 939
     🔴 Before: background-color: red; background: linear-gradient(45deg, #ff0000, #0000ff);
     🟢 After:  background: linear-gradient(45deg, #ff0000, #0000ff); background-color: red;

   ✓ AI fixed declaration-property-value-no-unknown at line 4529
     🔴 Before: padding-top: 10;
     🟢 After:  padding-top: 10px;

   🎉 AI applied 5 complex fixes
```

## 🛡️ Privacy & Security

- **API Key Security**: Store in `.env` file (never commit to Git)
- **CSS Content**: Only problematic sections sent to API
- **No Data Storage**: Groq doesn't store your CSS content
- **Secure Transport**: All requests use HTTPS

## 🚀 Next Steps

Once AI is working:

1. **Optimize Large Files**: AI handles the complex issues
2. **Learn from Fixes**: Study the before/after to improve your CSS
3. **Customize Settings**: Adjust error limits and timeouts
4. **Integrate in CI/CD**: Automate CSS optimization in your workflow

---

**🎉 Enjoy AI-powered CSS optimization!** 5. **Validation**: Final processing with PostCSS and Prettier

## Supported AI Fixes

- ✅ Complex shorthand property conflicts
- ✅ Nested CSS structure issues
- ✅ Advanced vendor prefix problems
- ✅ Malformed selector patterns
- ✅ Legacy CSS modernization
- ✅ Context-aware property ordering

## Cost Considerations

- Groq API is very affordable (much cheaper than OpenAI)
- Only processes problematic sections (not entire CSS)
- Limits to first 5 errors per run to control costs
- Uses efficient Llama 3.1 70B model

## Fallback Behavior

If AI fixes are disabled or fail:

- Falls back to regex-based fixes
- Still provides comprehensive optimization
- No functionality is lost
