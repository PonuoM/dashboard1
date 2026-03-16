import { useState, useRef, useEffect } from 'react';

function CustomSelect({ value, onChange, options, label, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 hover:border-primary/50 transition-colors cursor-pointer min-w-[140px]"
            >
                {label && (
                    <span className="text-xs font-semibold text-gray-400 uppercase">{label}</span>
                )}
                <span className="text-sm font-bold text-gray-800 flex-1 text-left">
                    {selectedOption?.label || 'เลือก...'}
                </span>
                <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[180px] bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-[100] max-h-64 overflow-y-auto custom-scrollbar">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${option.value === value
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-gray-600 hover:bg-gray-50 font-medium'
                                }`}
                        >
                            {option.value === value && (
                                <span className="material-symbols-outlined text-primary text-sm">check</span>
                            )}
                            <span className={option.value === value ? '' : 'ml-6'}>{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CustomSelect;
