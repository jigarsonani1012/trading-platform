import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
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
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#2A2A3A',
                        color: '#fff',
                        border: '1px solid #3A3A4A',
                        borderRadius: '12px',
                    },
                    success: {
                        iconTheme: {
                            primary: '#00B87C',
                            secondary: '#fff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#FF3B30',
                            secondary: '#fff',
                        },
                    },
                }}
            />
        </QueryClientProvider>
    </React.StrictMode>,
);
