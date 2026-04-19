import React from 'react';
import { Pencil, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import ValidatedTextInput from '../ValidatedTextInput/ValidatedTextInput';
import { formatForCreation, formatForEdit, validateListName } from '../../utils/textUtils';

interface ListNameModalProps {
    isOpen: boolean;
    mode: 'create' | 'edit';
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
    existingNames: string[];
    currentName?: string;
}

const ListNameModal: React.FC<ListNameModalProps> = ({
    isOpen,
    mode,
    value,
    onChange,
    onSubmit,
    onCancel,
    existingNames,
    currentName = '',
}) => {
    if (!isOpen) {
        return null;
    }

    const isCreate = mode === 'create';
    const normalizedValue = isCreate ? formatForCreation(value) : formatForEdit(value);

    const handleSubmit = () => {
        const validation = validateListName(normalizedValue, existingNames);

        if (!validation.isValid) {
            toast.error(validation.error);
            return;
        }

        onSubmit();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-[28px] border border-gray-700/80 bg-linear-to-br from-gray-900 to-gray-950 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-blue-300/70">
                            {isCreate ? 'New List' : 'Edit List'}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-gray-100">
                            {isCreate ? 'Create a custom tracker' : 'Rename your collection'}
                        </h3>
                        <p className="mt-2 text-sm text-gray-400">
                            {isCreate
                                ? 'Organize stocks, funds, SIPs, and indices into focused lists.'
                                : `Change "${currentName}" to something new.`}
                        </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                        {isCreate ? <Plus className="h-6 w-6" /> : <Pencil className="h-6 w-6" />}
                    </div>
                </div>

                <div className="mt-6">
                    <ValidatedTextInput
                        value={value}
                        onChange={onChange}
                        onValidSubmit={handleSubmit}
                        placeholder="Example: Swing Trades, SIP Radar, Bank Picks"
                        label="List Name"
                        description="Letters, numbers, spaces, &, -, ., () only"
                        maxLength={25}
                        validate={(nextValue) =>
                            validateListName(
                                isCreate ? formatForCreation(nextValue) : formatForEdit(nextValue),
                                existingNames
                            )
                        }
                        autoFocus
                    />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer rounded-xl bg-gray-800 px-4 py-2 text-gray-200 transition-colors hover:bg-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!normalizedValue}
                        className="cursor-pointer rounded-xl bg-blue-500 px-5 py-2 text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isCreate ? 'Create List' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ListNameModal;
