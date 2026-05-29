import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Localized ErrorBoundary React Class Component.
 * Intercepts JS exceptions inside child dashboard components to prevent complete system shell crashes.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  declare public props: Props;

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an execution exception: ", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-white/30 backdrop-blur-md border border-rose-200/50 rounded-3xl p-8 text-center shadow-lg max-w-lg mx-auto my-6 space-y-4">
          <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center border border-rose-100">
            <ShieldAlert className="h-6 w-6 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-black text-rose-950 uppercase tracking-wider">Module Execution Suspended</h4>
            <p className="text-xs text-stone-600 leading-relaxed font-semibold">
              A localized runtime exception was isolated inside this dashboard widget. The master console continues executing safely.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-left text-rose-800 overflow-x-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={() => (this as any).setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#5C3F2A] hover:bg-[#48301E] text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
          >
            Re-initiate Execution
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Offline Sync and Cache Layer.
 * Leverages localStorage stores to intercept network failures and serve client-cached recipes or catalog arrays seamlessly.
 */
export const offlineCache = {
  save: (key: string, data: any): void => {
    try {
      localStorage.setItem(`daily_grind_offline_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to persist data in offline cache: ", e);
    }
  },
  
  load: <T extends unknown>(key: string, fallbackData: T): T => {
    try {
      const cached = localStorage.getItem(`daily_grind_offline_${key}`);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (e) {
      console.error("Failed to read data from offline cache: ", e);
    }
    return fallbackData;
  },

  fetchWithOfflineSync: async <T extends unknown>(url: string, key: string, token?: string): Promise<T> => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP Error status response code: ${res.status}`);
      }
      
      const data = await res.json();
      offlineCache.save(key, data);
      return data as T;
    } catch (err) {
      console.warn(`Network disruption detected while fetching ${url}. Intercepting failure and loading cached database from offline stores: `, err);
      return offlineCache.load<T>(key, [] as unknown as T);
    }
  }
};
