import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/shared/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 30000,
            retry: 1,
            gcTime: 5 * 60 * 1000,
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
            <App />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#0f172a',
                        color: '#f8fafc',
                        border: '1px solid #1e293b',
                        borderRadius: '16px',
                    },
                    success: {
                        iconTheme: {
                            primary: '#14b8a6',
                            secondary: '#f8fafc',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#f8fafc',
                        },
                    },
                }}
            />
        </ErrorBoundary>
    </QueryClientProvider>,
);
