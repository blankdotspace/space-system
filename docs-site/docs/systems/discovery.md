# Neynar Mini Apps Integration

A streamlined Mini App integration that leverages the official [Neynar Mini Apps Catalog API](https://docs.neynar.com/reference/fetch-frame-catalog) for high-quality, curated Farcaster Frame and Mini App discovery.

## 🎯 Overview

- **Direct Neynar API integration** - Official Farcaster ecosystem data
- **Smart caching** - 15-minute refresh with database fallback
- **Advanced filtering** - Categories, networks, trending algorithms
- **Rich metadata** - Author info, engagement metrics, screenshots
- **Search functionality** - Full-text search across apps
- **Zero infrastructure** - No Edge Functions or scheduled jobs needed

## 🏗️ Architecture

### Core Components

1. **NeynarMiniAppService** - Direct API integration with in-memory caching
2. **API Endpoints** - Enhanced filtering, search, and trending support  
3. **FidgetOptionsService** - Updated to use Neynar data seamlessly

## 📁 Key Files

- `src/common/data/services/neynarMiniAppService.ts` - Main service
- `src/app/api/miniapp-discovery/route.ts` - API endpoints


## 🚀 Quick Setup

1. **Get Neynar API key** from https://neynar.com
2. **Set environment variable**: `NEYNAR_API_KEY=your_key_here`
3. **Test**: `curl "http://localhost:3000/api/miniapp-discovery?limit=5"`

## 🔧 Usage

### Service API

```typescript
const neynarService = NeynarMiniAppService.getInstance();

// Get trending apps
const trending = await neynarService.getTrendingMiniApps('24h', 20);

// Get by category  
const games = await neynarService.getMiniAppsByCategory(['games'], 50);

// Search apps
const results = await neynarService.searchMiniApps('defi');
```

### API Endpoints

```bash
# Get apps with filters
GET /api/miniapp-discovery?category=games&trending=true&limit=20

# Search apps
POST /api/miniapp-discovery
{"action": "search", "query": "defi swap"}

# Refresh cache
POST /api/miniapp-discovery
{"action": "refresh"}
```

## 🧪 Testing

```bash
# Run tests
npm run test:fast
npm run test:unit

# Test API directly
curl "http://localhost:3000/api/miniapp-discovery?trending=true&limit=5" | jq
```

## 🛠️ Troubleshooting

- **No results**: Check `NEYNAR_API_KEY` environment variable
- **Slow responses**: Clear cache with `{"action": "refresh"}`
- **API errors**: Test Neynar API directly at https://docs.neynar.com

## 📖 References

- [Neynar Mini Apps Catalog API](https://docs.neynar.com/reference/fetch-frame-catalog)

---

**Last updated**: December 2024  
**Version**: 2.0.0 (Neynar Integration)  
**Status**: Production Ready