import { useState, useRef, useEffect } from 'react';

function MultiSelect({
    options = [],
    value = [],
    onChange,
    placeholder = 'เลือก...',
    allLabel = 'ทั้งหมด',
    showAllOption = true
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isAllSelected = value.length === 0 || value.includes('all');

    const handleToggleAll = () => {
        if (isAllSelected) {
            // If all is selected, keep it (can't deselect all)
        } else {
            onChange([]);
        }
    };

    const handleToggleOption = (optionValue) => {
        if (optionValue === 'all') {
            onChange([]);
            return;
        }

        let newValue;
        if (value.includes(optionValue)) {
            // Remove
            newValue = value.filter(v => v !== optionValue && v !== 'all');
        } else {
            // Add
            newValue = [...value.filter(v => v !== 'all'), optionValue];
        }

        // If empty, set to all
        if (newValue.length === 0) {
            newValue = [];
        }

        onChange(newValue);
    };

    const getDisplayText = () => {
        if (isAllSelected || value.length === 0) {
            return allLabel;
        }
        if (value.length === 1) {
            const opt = options.find(o => o.value === value[0]);
            return opt?.label || value[0];
        }
        return `${value.length} รายการ`;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-primary transition-all min-w-[120px]"
            >
                <span className="truncate">{getDisplayText()}</span>
                <span className={`material-symbols-outlined text-sm text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                    {showAllOption && (
                        <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() => onChange([])}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-gray-700">{allLabel}</span>
                        </label>
                    )}
                    {options.filter(o => o.value !== 'all').map((option) => (
                        <label
                            key={option.value}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={!isAllSelected && value.includes(option.value)}
                                onChange={() => handleToggleOption(option.value)}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-gray-600 truncate">{option.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MultiSelect;
