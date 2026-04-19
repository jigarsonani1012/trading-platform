import React from 'react';

type ErrorBoundaryState = {
    hasError: boolean;
};

type ErrorBoundaryProps = {
    children: React.ReactNode;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
    };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        if (import.meta.env.DEV) {
            console.error('Unhandled application error', error);
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Application Error</p>
                        <h1 className="mt-3 text-3xl font-semibold">Something went wrong</h1>
                        <p className="mt-3 text-sm text-slate-400">
                            Refresh the page to reconnect. If the issue continues, check the API and websocket environment
                            settings for this deployment.
                        </p>
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 font-medium text-slate-950 transition-colors hover:bg-cyan-400"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
