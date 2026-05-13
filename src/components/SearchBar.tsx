import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VocabularyService } from '../services/vocabulary.service';
import type { SearchIndex } from '../models/index.model';
import { useResponsive } from '../context/Responsive/useResponsive';

export const SearchBar: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchIndex>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { isMobile } = useResponsive();

    useEffect(() => {
        const fetchResults = async () => {
            if (query.trim().length === 0) {
                setResults([]);
                return;
            }
            setIsSearching(true);
            const res = await VocabularyService.searchVocab(query);
            setResults(res);
            setIsSearching(false);
        };

        const timer = setTimeout(() => {
            fetchResults();
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (id: string) => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        navigate(`/vocab/${id}`);
    };

    return (
        <div ref={wrapperRef} className={`relative ${isMobile ? 'flex-1 mx-2' : 'w-64 md:w-96 mx-4'}`}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search vocabulary..."
                    className="w-full bg-card border border-divider rounded-full py-1.5 md:py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-primary placeholder-tertiary transition-colors"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                {query && (
                    <button 
                        onClick={() => { setQuery(''); setResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {isOpen && query.trim().length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-card border border-divider rounded-lg shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                    {isSearching ? (
                        <div className="p-4 text-center text-sm text-tertiary">Searching...</div>
                    ) : results.length > 0 ? (
                        <div className="flex flex-col">
                            {results.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item.id)}
                                    className="flex flex-col items-start p-3 border-b border-divider/50 hover:bg-hover transition-colors text-left last:border-0"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-mincho text-primary text-lg">{item.w}</span>
                                        <span className="font-gothic text-secondary text-sm">{item.r}</span>
                                    </div>
                                    <span className="font-serif text-tertiary text-xs truncate w-full mt-1">
                                        {item.m}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm text-tertiary">No results found</div>
                    )}
                </div>
            )}
        </div>
    );
};
