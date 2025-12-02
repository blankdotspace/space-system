# Supabase Integration

Nounspace uses Supabase for database management, authentication, and file storage, providing a scalable backend infrastructure.

## Overview

Supabase integration provides:
- **Database Management** - PostgreSQL database with real-time subscriptions
- **File Storage** - Encrypted file storage for spaces and assets
- **Authentication** - User authentication and session management
- **Real-time Features** - Real-time data synchronization

## Database Schema

### 1. Core Tables
```sql
-- Community configurations
CREATE TABLE community_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id VARCHAR(50) NOT NULL UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  brand_config JSONB NOT NULL,
  assets_config JSONB NOT NULL,
  community_config JSONB NOT NULL,
  fidgets_config JSONB NOT NULL,
  navigation_config JSONB,
  ui_config JSONB,
  is_published BOOLEAN DEFAULT true
);

-- Space registrations (includes navPage type)
CREATE TABLE spaceRegistrations (
  spaceId UUID PRIMARY KEY,
  fid INTEGER,
  spaceName TEXT NOT NULL,
  spaceType TEXT NOT NULL CHECK (spaceType IN ('profile', 'token', 'proposal', 'channel', 'navPage')),
  identityPublicKey TEXT,
  signature TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spaces table
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fidgets table
CREATE TABLE fidgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id),
  type TEXT NOT NULL,
  config JSONB,
  position JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Relationships
```sql
-- Space ownership
ALTER TABLE spaces ADD CONSTRAINT fk_spaces_owner 
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE;

-- Fidget ownership
ALTER TABLE fidgets ADD CONSTRAINT fk_fidgets_space 
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX idx_community_configs_community_id ON community_configs(community_id);
CREATE INDEX idx_community_configs_published ON community_configs(is_published) WHERE is_published = true;
CREATE INDEX idx_spaces_owner_id ON spaces(owner_id);
CREATE INDEX idx_fidgets_space_id ON fidgets(space_id);
CREATE INDEX idx_spaces_public ON spaces(is_public) WHERE is_public = TRUE;
```

### 2. Database Functions

```sql
-- Get active community configuration
-- Returns the most recently updated published config for a community
CREATE OR REPLACE FUNCTION get_active_community_config(
    p_community_id VARCHAR(50)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
BEGIN
    SELECT jsonb_build_object(
        'brand', "brand_config",
        'assets', "assets_config",
        'community', "community_config",
        'fidgets', "fidgets_config",
        'navigation', "navigation_config",
        'ui', "ui_config"
    )
    INTO v_config
    FROM "public"."community_configs"
    WHERE "community_id" = p_community_id
    AND "is_published" = true
    ORDER BY "updated_at" DESC
    LIMIT 1;
    
    RETURN v_config;
END;
$$;
```

## File Storage

### 1. Storage Structure
```
supabase/storage/
├── spaces/           # Public space files (including navPage spaces)
│   ├── {spaceId}/
│   │   ├── tabOrder  # Tab order for navigation pages
│   │   ├── tabs/
│   │   │   ├── {tabName}  # Individual tab configs (SignedFile format)
│   │   │   └── ...
│   │   └── assets/
│   └── ...
├── private/         # Private space files
│   ├── {identityKey}/
│   │   ├── homebase
│   │   └── tabs/
│   │       ├── {tabName}
│   │       └── ...
│   └── ...
└── assets/          # Shared assets
    ├── images/
    ├── videos/
    └── ...
```

### 2. File Operations
```typescript
// File upload
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: UploadOptions
) => {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      ...options
    });
  
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  
  return data;
};

// File download
export const downloadFile = async (bucket: string, path: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);
  
  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
  
  return data;
};

// File deletion
export const deleteFile = async (bucket: string, path: string) => {
  const supabase = createClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
};
```

## Database Operations

### 1. CRUD Operations
```typescript
// Create space
export const createSpace = async (spaceData: SpaceData) => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('spaces')
    .insert(spaceData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Create space failed: ${error.message}`);
  }
  
  return data;
};

// Read space
export const getSpace = async (spaceId: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', spaceId)
    .single();
  
  if (error) {
    throw new Error(`Get space failed: ${error.message}`);
  }
  
  return data;
};

// Update space
export const updateSpace = async (spaceId: string, updates: Partial<SpaceData>) => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('spaces')
    .update(updates)
    .eq('id', spaceId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Update space failed: ${error.message}`);
  }
  
  return data;
};

// Delete space
export const deleteSpace = async (spaceId: string) => {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('spaces')
    .delete()
    .eq('id', spaceId);
  
  if (error) {
    throw new Error(`Delete space failed: ${error.message}`);
  }
};
```

### 2. Complex Queries
```typescript
// Get user spaces with fidgets
export const getUserSpaces = async (userId: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('spaces')
    .select(`
      *,
      fidgets (
        id,
        type,
        config,
        position
      )
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Get user spaces failed: ${error.message}`);
  }
  
  return data;
};

// Get public spaces
export const getPublicSpaces = async (limit: number = 20, offset: number = 0) => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('spaces')
    .select(`
      *,
      users!spaces_owner_id_fkey (
        id,
        email
      )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    throw new Error(`Get public spaces failed: ${error.message}`);
  }
  
  return data;
};
```

## Real-time Features

### 1. Real-time Subscriptions
```typescript
// Subscribe to space changes
export const subscribeToSpace = (spaceId: string, callback: (payload: any) => void) => {
  const supabase = createClient();
  
  const subscription = supabase
    .channel('space-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'spaces',
        filter: `id=eq.${spaceId}`
      },
      callback
    )
    .subscribe();
  
  return subscription;
};

// Subscribe to fidget changes
export const subscribeToFidgets = (spaceId: string, callback: (payload: any) => void) => {
  const supabase = createClient();
  
  const subscription = supabase
    .channel('fidget-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'fidgets',
        filter: `space_id=eq.${spaceId}`
      },
      callback
    )
    .subscribe();
  
  return subscription;
};
```

### 2. Real-time Updates
```typescript
// Real-time space updates
export const useRealtimeSpace = (spaceId: string) => {
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchSpace = async () => {
      try {
        const spaceData = await getSpace(spaceId);
        setSpace(spaceData);
      } catch (error) {
        console.error('Failed to fetch space:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSpace();
    
    const subscription = subscribeToSpace(spaceId, (payload) => {
      if (payload.eventType === 'UPDATE') {
        setSpace(payload.new);
      } else if (payload.eventType === 'DELETE') {
        setSpace(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [spaceId]);
  
  return { space, loading };
};
```

## Authentication

### 1. User Authentication
```typescript
// Sign up user
export const signUpUser = async (email: string, password: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Sign up failed: ${error.message}`);
  }
  
  return data;
};

// Sign in user
export const signInUser = async (email: string, password: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Sign in failed: ${error.message}`);
  }
  
  return data;
};

// Sign out user
export const signOutUser = async () => {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
};
```

### 2. Session Management
```typescript
// Get current session
export const getCurrentSession = async () => {
  const supabase = createClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Get session failed: ${error.message}`);
  }
  
  return session;
};

// Listen to auth changes
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  const supabase = createClient();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  
  return subscription;
};
```

## Security

### 1. Row Level Security
```sql
-- Enable RLS on spaces table
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Users can only see their own spaces
CREATE POLICY "Users can view own spaces" ON spaces
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can only update their own spaces
CREATE POLICY "Users can update own spaces" ON spaces
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can only delete their own spaces
CREATE POLICY "Users can delete own spaces" ON spaces
  FOR DELETE USING (auth.uid() = owner_id);

-- Public spaces are visible to everyone
CREATE POLICY "Public spaces are visible to everyone" ON spaces
  FOR SELECT USING (is_public = TRUE);
```

### 2. File Storage Security
```typescript
// Secure file upload
export const uploadSecureFile = async (
  bucket: string,
  path: string,
  file: File,
  userId: string
) => {
  const supabase = createClient();
  
  // Verify user ownership
  const { data: user } = await supabase.auth.getUser();
  if (user.user?.id !== userId) {
    throw new Error('Unauthorized file upload');
  }
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  
  return data;
};
```

## Performance Optimization

### 1. Database Indexing
```sql
-- Create indexes for common queries
CREATE INDEX idx_spaces_owner_created ON spaces(owner_id, created_at DESC);
CREATE INDEX idx_fidgets_space_type ON fidgets(space_id, type);
CREATE INDEX idx_spaces_public_created ON spaces(is_public, created_at DESC) WHERE is_public = TRUE;
```

### 2. Query Optimization
```typescript
// Optimized query with proper joins
export const getSpaceWithFidgets = async (spaceId: string) => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('spaces')
    .select(`
      id,
      name,
      description,
      is_public,
      created_at,
      fidgets!inner (
        id,
        type,
        config,
        position
      )
    `)
    .eq('id', spaceId)
    .single();
  
  if (error) {
    throw new Error(`Get space with fidgets failed: ${error.message}`);
  }
  
  return data;
};
```

## Error Handling

### 1. Database Errors
```typescript
// Handle database errors
export const handleDatabaseError = (error: any) => {
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return 'Record already exists';
      case '23503': // Foreign key violation
        return 'Referenced record not found';
      case '23502': // Not null violation
        return 'Required field is missing';
      case '42P01': // Undefined table
        return 'Database table not found';
      default:
        return `Database error: ${error.message}`;
    }
  }
  
  return 'Unknown database error';
};
```

### 2. Storage Errors
```typescript
// Handle storage errors
export const handleStorageError = (error: any) => {
  if (error.statusCode) {
    switch (error.statusCode) {
      case 400:
        return 'Invalid file or request';
      case 401:
        return 'Unauthorized file access';
      case 403:
        return 'Forbidden file access';
      case 404:
        return 'File not found';
      case 413:
        return 'File too large';
      default:
        return `Storage error: ${error.message}`;
    }
  }
  
  return 'Unknown storage error';
};
```

## Best Practices

### 1. Database Design
- **Normalize Data** - Use proper database normalization
- **Use Indexes** - Create indexes for frequently queried columns
- **Implement RLS** - Use Row Level Security for data protection
- **Optimize Queries** - Write efficient database queries

### 2. File Storage
- **Organize Files** - Use logical folder structures
- **Secure Access** - Implement proper access controls
- **Optimize Uploads** - Use appropriate file sizes and formats
- **Handle Errors** - Implement comprehensive error handling

### 3. Real-time Features
- **Efficient Subscriptions** - Only subscribe to necessary data
- **Handle Disconnections** - Implement reconnection logic
- **Optimize Updates** - Minimize unnecessary real-time updates
- **Error Recovery** - Handle subscription errors gracefully

## Troubleshooting

### Common Issues
1. **Connection Issues** - Check Supabase project configuration
2. **Authentication Errors** - Verify API keys and user permissions
3. **Storage Errors** - Check file permissions and bucket configuration
4. **Real-time Issues** - Verify subscription setup and error handling

### Debug Tools
- Use Supabase Dashboard for database inspection
- Check browser DevTools for API requests
- Monitor real-time connections in Supabase Dashboard
- Use Supabase CLI for local development
