// Client-side caching utility for rule suggestions
const CACHE_STORAGE_KEY = 'gemini_rule_suggestions_cache';
const CACHE_EXPIRY_KEY = 'gemini_rule_suggestions_expiry';
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// In-memory cache for current session
const sessionCache = new Map<string, any>();

// Generate a cache key based on data summary to detect changes
export function generateCacheKey(dataContext: any): string {
  const summary = {
    clientCount: dataContext.summary?.totalClients || 0,
    workerCount: dataContext.summary?.totalWorkers || 0,
    taskCount: dataContext.summary?.totalTasks || 0,
    clientGroups: dataContext.summary?.clientGroups?.sort() || [],
    workerGroups: dataContext.summary?.workerGroups?.sort() || [],
    taskCategories: dataContext.summary?.taskCategories?.sort() || [],
    skills: dataContext.summary?.skillsAvailable?.sort() || []
  };
  return JSON.stringify(summary);
}

// Load cache from localStorage
export function loadCacheFromStorage(): Map<string, any> {
  const cache = new Map<string, any>();
  
  try {
    const cacheData = localStorage.getItem(CACHE_STORAGE_KEY);
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    
    if (cacheData && expiry && Date.now() < parseInt(expiry)) {
      const parsedCache = JSON.parse(cacheData);
      Object.entries(parsedCache).forEach(([key, value]) => {
        cache.set(key, value);
        sessionCache.set(key, value);
      });
      console.log('Loaded rule suggestions from localStorage cache');
    } else {
      // Clear expired cache
      localStorage.removeItem(CACHE_STORAGE_KEY);
      localStorage.removeItem(CACHE_EXPIRY_KEY);
    }
  } catch (error) {
    console.warn('Failed to load cache from localStorage:', error);
  }
  
  return cache;
}

// Save cache to localStorage
export function saveCacheToStorage(cache: Map<string, any>): void {
  try {
    const cacheObject = Object.fromEntries(cache);
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheObject));
    localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
    console.log('Saved rule suggestions cache to localStorage');
  } catch (error) {
    console.warn('Failed to save cache to localStorage:', error);
  }
}

// Get from cache (checks both session and localStorage)
export function getCachedSuggestions(cacheKey: string): any | null {
  // Check session cache first
  if (sessionCache.has(cacheKey)) {
    console.log('Returning suggestions from session cache');
    return sessionCache.get(cacheKey);
  }
  
  // Check localStorage cache
  const persistentCache = loadCacheFromStorage();
  if (persistentCache.has(cacheKey)) {
    console.log('Returning suggestions from localStorage cache');
    return persistentCache.get(cacheKey);
  }
  
  return null;
}

// Set cache (updates both session and localStorage)
export function setCachedSuggestions(cacheKey: string, data: any): void {
  sessionCache.set(cacheKey, data);
  saveCacheToStorage(sessionCache);
  console.log('Cached new rule suggestions');
}

// Clear all caches
export function clearAllCaches(): void {
  sessionCache.clear();
  localStorage.removeItem(CACHE_STORAGE_KEY);
  localStorage.removeItem(CACHE_EXPIRY_KEY);
  console.log('Rule suggestions cache cleared');
}

// Check if cache is available and not expired
export function isCacheValid(): boolean {
  try {
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
    return expiry ? Date.now() < parseInt(expiry) : false;
  } catch {
    return false;
  }
}
