# Farcaster Integration

Blankspace integrates deeply with the Farcaster protocol to provide social features and identity management.

## Overview

Farcaster integration enables:
- **Social Identity** - Farcaster ID (FID) linking and management
- **Social Features** - Casts, feeds, and social interactions
- **Protocol Access** - Direct access to Farcaster protocol features
- **Identity Verification** - Cryptographic identity verification

## Core Components

### 1. FID Management
```typescript
// FID linking and management
export type FarcasterStore = {
  getFidsForCurrentIdentity: () => Promise<void>;
  registerFidForCurrentIdentity: (
    fid: number,
    signingKey: string,
    signMessage: (messageHash: Uint8Array) => Promise<Uint8Array>,
  ) => Promise<void>;
  setFidsForCurrentIdentity: (fids: number[]) => void;
  addFidToCurrentIdentity: (fid: number) => void;
};
```

### 2. Identity Linking
```typescript
// Link Farcaster FID to identity
const registerFidForCurrentIdentity = async (
  fid: number,
  signingKey: string,
  signMessage: (messageHash: Uint8Array) => Promise<Uint8Array>,
) => {
  const request: Omit<FidLinkToIdentityRequest, "signature"> = {
    fid,
    identityPublicKey: get().account.currentSpaceIdentityPublicKey!,
    timestamp: moment().toISOString(),
    signingPublicKey: signingKey,
  };
  
  const signedRequest: FidLinkToIdentityRequest = {
    ...request,
    signature: bytesToHex(await signMessage(hashObject(request))),
  };
  
  const { data } = await axiosBackend.post<FidLinkToIdentityResponse>(
    "/api/fid-link",
    signedRequest,
  );
  
  if (!isUndefined(data.value)) {
    get().account.addFidToCurrentIdentity(data.value!.fid);
    analytics.track(AnalyticsEvent.LINK_FID, { fid });
  }
};
```

## Farcaster Fidgets

### 1. Cast Fidget
```typescript
// Cast display and interaction
export const Cast: FidgetModule<CastArgs> = {
  Component: ({ config, properties, theme }) => {
    const [cast, setCast] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const fetchCast = async () => {
        try {
          const castData = await api.getCast(config.castHash);
          setCast(castData);
        } catch (error) {
          console.error('Failed to fetch cast:', error);
        } finally {
          setLoading(false);
        }
      };
      
      if (config.castHash) {
        fetchCast();
      }
    }, [config.castHash]);
    
    if (loading) return <div>Loading cast...</div>;
    if (!cast) return <div>Cast not found</div>;
    
    return (
      <div className="cast-fidget">
        <div className="cast-header">
          <img src={cast.author.pfp_url} alt={cast.author.display_name} />
          <div>
            <h3>{cast.author.display_name}</h3>
            <p>@{cast.author.username}</p>
          </div>
        </div>
        <div className="cast-content">
          <p>{cast.text}</p>
        </div>
        <div className="cast-actions">
          <button>Like</button>
          <button>Recast</button>
          <button>Reply</button>
        </div>
      </div>
    );
  },
  properties: {
    fidgetName: "Cast",
    description: "Display and interact with Farcaster casts",
    fields: [
      {
        fieldName: "castHash",
        type: "string",
        default: "",
        label: "Cast Hash"
      }
    ],
    category: "farcaster",
    tags: ["farcaster", "social"],
    version: "1.0.0"
  }
};
```

### 2. Feed Fidget
```typescript
// Feed display and management
export const Feed: FidgetModule<FeedArgs> = {
  Component: ({ config, properties, theme }) => {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const fetchFeed = async () => {
        try {
          const feedData = await api.getFeed(config.feedType);
          setFeed(feedData);
        } catch (error) {
          console.error('Failed to fetch feed:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchFeed();
    }, [config.feedType]);
    
    if (loading) return <div>Loading feed...</div>;
    
    return (
      <div className="feed-fidget">
        <h3>Feed</h3>
        <div className="feed-content">
          {feed.map(cast => (
            <CastItem key={cast.hash} cast={cast} />
          ))}
        </div>
      </div>
    );
  },
  properties: {
    fidgetName: "Feed",
    description: "Display Farcaster feed",
    fields: [
      {
        fieldName: "feedType",
        type: "select",
        default: "following",
        options: ["following", "trending", "recent"],
        label: "Feed Type"
      }
    ],
    category: "farcaster",
    tags: ["farcaster", "social", "feed"],
    version: "1.0.0"
  }
};
```

### 3. Frame Fidget
```typescript
// Frame display and interaction
export const Frame: FidgetModule<FrameArgs> = {
  Component: ({ config, properties, theme }) => {
    const [frame, setFrame] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const fetchFrame = async () => {
        try {
          const frameData = await api.getFrame(config.frameUrl);
          setFrame(frameData);
        } catch (error) {
          console.error('Failed to fetch frame:', error);
        } finally {
          setLoading(false);
        }
      };
      
      if (config.frameUrl) {
        fetchFrame();
      }
    }, [config.frameUrl]);
    
    if (loading) return <div>Loading frame...</div>;
    if (!frame) return <div>Frame not found</div>;
    
    return (
      <div className="frame-fidget">
        <iframe
          src={frame.url}
          width="100%"
          height="400"
          frameBorder="0"
          title={frame.title}
        />
      </div>
    );
  },
  properties: {
    fidgetName: "Frame",
    description: "Display Farcaster frames",
    fields: [
      {
        fieldName: "frameUrl",
        type: "string",
        default: "",
        label: "Frame URL"
      }
    ],
    category: "farcaster",
    tags: ["farcaster", "frame", "interactive"],
    version: "1.0.0"
  }
};
```

## API Integration

### 1. Neynar API
```typescript
// Neynar API integration
export class NeynarAPI {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.neynar.com/v2';
  }
  
  async getUser(fid: number) {
    const response = await fetch(`${this.baseUrl}/farcaster/user/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_key': this.apiKey
      },
      body: JSON.stringify({ fids: [fid] })
    });
    
    return response.json();
  }
  
  async getCast(hash: string) {
    const response = await fetch(`${this.baseUrl}/farcaster/cast`, {
      method: 'GET',
      headers: {
        'api_key': this.apiKey
      }
    });
    
    return response.json();
  }
  
  async getFeed(feedType: string) {
    const response = await fetch(`${this.baseUrl}/farcaster/feed`, {
      method: 'GET',
      headers: {
        'api_key': this.apiKey
      }
    });
    
    return response.json();
  }
}
```

### 2. Farcaster Protocol
```typescript
// Direct Farcaster protocol integration
export class FarcasterProtocol {
  private hubUrl: string;
  
  constructor(hubUrl: string) {
    this.hubUrl = hubUrl;
  }
  
  async getCast(hash: string) {
    const response = await fetch(`${this.hubUrl}/v1/castById`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hash })
    });
    
    return response.json();
  }
  
  async getUser(fid: number) {
    const response = await fetch(`${this.hubUrl}/v1/userDataByFid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fid })
    });
    
    return response.json();
  }
}
```

## Social Features

### 1. Cast Interaction
```typescript
// Cast interaction functionality
export const useCastInteraction = (castHash: string) => {
  const [cast, setCast] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const likeCast = async () => {
    setLoading(true);
    try {
      await api.likeCast(castHash);
      setCast(prev => ({ ...prev, likes: prev.likes + 1 }));
    } catch (error) {
      console.error('Failed to like cast:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const recast = async () => {
    setLoading(true);
    try {
      await api.recast(castHash);
      setCast(prev => ({ ...prev, recasts: prev.recasts + 1 }));
    } catch (error) {
      console.error('Failed to recast:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const reply = async (text: string) => {
    setLoading(true);
    try {
      await api.replyToCast(castHash, text);
    } catch (error) {
      console.error('Failed to reply to cast:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return { cast, loading, likeCast, recast, reply };
};
```

### 2. Social Graph
```typescript
// Social graph functionality
export const useSocialGraph = (fid: number) => {
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fetchFollowing = async () => {
    setLoading(true);
    try {
      const data = await api.getFollowing(fid);
      setFollowing(data);
    } catch (error) {
      console.error('Failed to fetch following:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFollowers = async () => {
    setLoading(true);
    try {
      const data = await api.getFollowers(fid);
      setFollowers(data);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return { following, followers, loading, fetchFollowing, fetchFollowers };
};
```

## Identity Management

### 1. FID Verification
```typescript
// FID verification process
export const verifyFid = async (fid: number, signature: string) => {
  try {
    const response = await fetch('/api/verify-fid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fid, signature })
    });
    
    if (!response.ok) {
      throw new Error('FID verification failed');
    }
    
    return response.json();
  } catch (error) {
    console.error('FID verification error:', error);
    throw error;
  }
};
```

### 2. Identity Linking
```typescript
// Link Farcaster identity to app identity
export const linkFarcasterIdentity = async (
  fid: number,
  appIdentity: string,
  signature: string
) => {
  try {
    const response = await fetch('/api/link-farcaster', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fid,
        appIdentity,
        signature
      })
    });
    
    if (!response.ok) {
      throw new Error('Identity linking failed');
    }
    
    return response.json();
  } catch (error) {
    console.error('Identity linking error:', error);
    throw error;
  }
};
```

## Error Handling

### 1. API Error Handling
```typescript
// Farcaster API error handling
export const handleFarcasterError = (error: any) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return 'Invalid request parameters';
      case 401:
        return 'Unauthorized - check API key';
      case 404:
        return 'Farcaster resource not found';
      case 429:
        return 'Rate limit exceeded';
      case 500:
        return 'Farcaster server error';
      default:
        return `Farcaster API error: ${data.message || 'Unknown error'}`;
    }
  }
  
  return 'Network error - please check your connection';
};
```

### 2. Protocol Error Handling
```typescript
// Farcaster protocol error handling
export const handleProtocolError = (error: any) => {
  if (error.code) {
    switch (error.code) {
      case 'INVALID_SIGNATURE':
        return 'Invalid signature - please try again';
      case 'EXPIRED_MESSAGE':
        return 'Message expired - please refresh and try again';
      case 'INVALID_FID':
        return 'Invalid Farcaster ID';
      case 'NETWORK_ERROR':
        return 'Network error - please check your connection';
      default:
        return `Protocol error: ${error.message}`;
    }
  }
  
  return 'Unknown protocol error';
};
```

## Best Practices

### 1. API Usage
- **Rate Limiting** - Respect API rate limits
- **Error Handling** - Handle all possible error cases
- **Caching** - Cache API responses when appropriate
- **Authentication** - Secure API key management

### 2. Protocol Integration
- **Signature Verification** - Always verify signatures
- **Message Validation** - Validate all protocol messages
- **Error Recovery** - Implement proper error recovery
- **Security** - Follow security best practices

### 3. User Experience
- **Loading States** - Show loading states for async operations
- **Error Messages** - Provide clear error messages
- **Offline Support** - Handle offline scenarios gracefully
- **Performance** - Optimize for performance

## Troubleshooting

### Common Issues
1. **API Key Issues** - Verify Neynar API key configuration
2. **Signature Errors** - Check signature generation and verification
3. **Network Issues** - Handle network connectivity problems
4. **Rate Limiting** - Implement proper rate limiting handling

### Debug Tools
- Use browser DevTools to inspect API requests
- Check Farcaster protocol documentation
- Verify signature generation with test tools
- Monitor API usage and limits
