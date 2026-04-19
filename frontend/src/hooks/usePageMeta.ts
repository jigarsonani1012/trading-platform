import { useEffect } from 'react';

type PageMetaOptions = {
    title: string;
    description: string;
};

const DEFAULT_TITLE = 'StockTracker';

const upsertMetaTag = (selector: string, attributes: Record<string, string>, content: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);

    if (!element) {
        element = document.createElement('meta');
        Object.entries(attributes).forEach(([key, value]) => {
            element?.setAttribute(key, value);
        });
        document.head.appendChild(element);
    }

    element.content = content;
};

export const usePageMeta = ({ title, description }: PageMetaOptions) => {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = title.includes(DEFAULT_TITLE) ? title : `${title} | ${DEFAULT_TITLE}`;

        upsertMetaTag('meta[name="description"]', { name: 'description' }, description);
        upsertMetaTag('meta[property="og:title"]', { property: 'og:title' }, document.title);
        upsertMetaTag('meta[property="og:description"]', { property: 'og:description' }, description);
        upsertMetaTag('meta[name="twitter:title"]', { name: 'twitter:title' }, document.title);
        upsertMetaTag('meta[name="twitter:description"]', { name: 'twitter:description' }, description);

        return () => {
            document.title = previousTitle;
        };
    }, [description, title]);
};
