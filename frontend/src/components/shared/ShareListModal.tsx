import React, { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    FacebookIcon,
    FacebookShareButton,
    LinkedinIcon,
    LinkedinShareButton,
    TelegramIcon,
    TelegramShareButton,
    TwitterIcon,
    TwitterShareButton,
    WhatsappIcon,
    WhatsappShareButton,
} from 'react-share';

interface ShareListModalProps {
    isOpen: boolean;
    shareUrl: string;
    listName: string;
    onClose: () => void;
}

const ShareListModal: React.FC<ShareListModalProps> = ({
    isOpen,
    shareUrl,
    listName,
    onClose,
}) => {
    const [isCopied, setIsCopied] = useState(false);

    if (!isOpen) {
        return null;
    }

    const shareTitle = `Check out my stock watchlist: ${listName}`;

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        toast.success('Link copied!');
        window.setTimeout(() => setIsCopied(false), 2000);
    };

    const shareButtons = [
        {
            id: 'whatsapp',
            button: WhatsappShareButton,
            icon: WhatsappIcon,
            className: 'bg-green-600 hover:bg-green-500',
            label: 'WhatsApp',
        },
        {
            id: 'telegram',
            button: TelegramShareButton,
            icon: TelegramIcon,
            className: 'bg-blue-500 hover:bg-blue-400',
            label: 'Telegram',
        },
        {
            id: 'twitter',
            button: TwitterShareButton,
            icon: TwitterIcon,
            className: 'bg-sky-600 hover:bg-sky-500',
            label: 'Twitter',
        },
        {
            id: 'facebook',
            button: FacebookShareButton,
            icon: FacebookIcon,
            className: 'bg-blue-700 hover:bg-blue-600',
            label: 'Facebook',
        },
        {
            id: 'linkedin',
            button: LinkedinShareButton,
            icon: LinkedinIcon,
            className: 'bg-blue-800 hover:bg-blue-700',
            label: 'LinkedIn',
        },
    ] as const;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">Share "{listName}"</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 transition-colors hover:bg-gray-800"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <div className="mb-4 flex gap-2">
                    <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                    />
                    <button
                        type="button"
                        onClick={copyToClipboard}
                        className="cursor-pointer rounded-lg bg-gray-700 p-2 transition-colors hover:bg-gray-600"
                    >
                        {isCopied ? (
                            <Check className="h-5 w-5 text-green-500" />
                        ) : (
                            <Copy className="h-5 w-5 text-gray-300" />
                        )}
                    </button>
                </div>

                <div className="mb-6 flex justify-between gap-3">
                    {shareButtons.map(({ id, button: Button, icon: Icon, className, label }) => (
                        <Button key={id} url={shareUrl} title={shareTitle}>
                            <div className={`flex flex-col items-center gap-1 rounded-xl p-3 text-white transition-colors ${className}`}>
                                <Icon size={24} round />
                                <span className="text-xs">{label}</span>
                            </div>
                        </Button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer w-full rounded-lg bg-gray-700 py-2 text-white transition-colors hover:bg-gray-600"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default ShareListModal;
