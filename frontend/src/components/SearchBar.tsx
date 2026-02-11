"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Filter } from "lucide-react";
import { searchSchools, type School } from "@/lib/api";

interface SearchBarProps {
  onSchoolSelect: (school: School) => void;
  onFilterChange?: (filters: { state: string; control: string }) => void;
}

export default function SearchBar({ onSchoolSelect, onFilterChange }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<School[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [state, setState] = useState("");
  const [control, setControl] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const doSearch = useCallback(async (q: string, filterState: string, filterControl: string) => {
    const hasFilters = filterState !== "" || filterControl !== "";
    if (q.length < 2 && !hasFilters) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await searchSchools({
        q,
        state: filterState,
        control: filterControl,
        limit: "10",
        page: "1",
      });
      setResults(res.data || []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query, state, control), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, state, control, doSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (school: School) => {
    setQuery(school.name);
    setShowResults(false);
    onSchoolSelect(school);
  };

  const handleFilterApply = () => {
    onFilterChange?.({ state, control });
    setShowFilters(false);
    // Immediately trigger search with current filters
    doSearch(query, state, control);
  };

  const handleFilterClear = () => {
    setState("");
    setControl("");
    onFilterChange?.({ state: "", control: "" });
    setShowFilters(false);
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search size={18} className="absolute left-3 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search schools by name or city..."
          className="w-full pl-10 pr-20 py-2.5 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/30 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 focus:shadow-lg focus:shadow-violet-500/5 transition-all"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-md transition-colors ${
              showFilters || state || control
                ? "bg-violet-600/20 text-violet-400"
                : "hover:bg-zinc-800 text-zinc-500 hover:text-white"
            }`}
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/30 rounded-xl shadow-2xl z-50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">All States</option>
                {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Type</label>
              <select
                value={control}
                onChange={(e) => setControl(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">All Types</option>
                <option value="public">Public</option>
                <option value="private_nonprofit">Private Non-Profit</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {(state || control) && (
              <button
                onClick={handleFilterClear}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleFilterApply}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/30 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((school) => (
            <button
              key={school.id}
              onClick={() => handleSelect(school)}
              className="w-full px-4 py-3 text-left hover:bg-zinc-800/80 transition-colors border-b border-zinc-800/50 last:border-0"
            >
              <div className="text-white text-sm font-medium">{school.name}</div>
              <div className="text-zinc-400 text-xs mt-0.5">
                {school.city}, {school.state} &middot;{" "}
                <span className={school.control === "public" ? "text-emerald-400" : "text-blue-400"}>
                  {school.control === "public" ? "Public" : "Private"}
                </span>

              </div>
            </button>
          ))}
          {loading && (
            <div className="px-4 py-3 text-zinc-500 text-sm text-center">Searching...</div>
          )}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/30 rounded-xl shadow-2xl p-4 z-50">
          <p className="text-zinc-500 text-sm text-center">No schools found</p>
        </div>
      )}
    </div>
  );
}
