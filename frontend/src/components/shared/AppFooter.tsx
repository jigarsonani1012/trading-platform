import React from 'react';

interface AppFooterProps {
    message: string;
}

const AppFooter: React.FC<AppFooterProps> = ({ message }) => {
    return (
        <footer className="mt-16 border-t border-slate-800/90 px-4 py-8">
            <div className="container mx-auto text-center text-sm text-slate-400">
                <p>{message}</p>
                <p className="mt-1">
                    &copy; {new Date().getFullYear()} StockTracker
                </p>
            </div>
        </footer>
    );
};

export default AppFooter;
