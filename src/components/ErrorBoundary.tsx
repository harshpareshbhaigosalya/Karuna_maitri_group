import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
      localStorage.removeItem("km_auth_session");
    } catch (err) {
      console.warn("Failed to clear cache during recovery reload:", err);
    } finally {
      window.location.href = "/";
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6 font-sans">
          <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-cream-200 shadow-xl space-y-6 text-center">
            <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-3xl">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-royal-900">એપ્લિકેશન લોડ કરવામાં સમસ્યા આવી</h1>
              <p className="text-gray-500 text-xs leading-relaxed font-sans">
                બ્રાઉઝર કેશ અથવા સિસ્ટમ અપડેટને લીધે જૂની ફાઇલો લોડ થઈ શકતી નથી. કૃપા કરીને નીચે આપેલ બટન પર ક્લિક કરી સાઈટ તાજી કરો.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-left text-[11px] font-mono text-red-700 overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 bg-royal-800 hover:bg-royal-900 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all active:scale-95 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              <span>સાઈટ રિફ્રેશ કરો અને કેશ સાફ કરો</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
