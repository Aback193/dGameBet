'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Image from 'next/image';
import { Shield } from 'lucide-react';
import { useTeamSearch } from '@/hooks/useTeamSearch';

interface TeamAutocompleteProps {
	label: string;
	value: string;
	onChange: (name: string) => void;
	error?: string;
	placeholder?: string;
	disabled?: boolean;
}

export function TeamAutocomplete({
	label,
	value,
	onChange,
	error,
	placeholder = 'Search for a team...',
	disabled = false,
}: TeamAutocompleteProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const inputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const listboxId = useId();
	const inputId = useId();

	const results = useTeamSearch(value);

	const shouldShowDropdown = isOpen && results.length > 0 && value.length >= 2;

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
				setActiveIndex(-1);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (!shouldShowDropdown) {
			if (e.key === 'ArrowDown' && value.length >= 2) {
				setIsOpen(true);
			}
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case 'Enter':
				e.preventDefault();
				if (activeIndex >= 0 && results[activeIndex]) {
					handleSelect(results[activeIndex].name);
				}
				break;
			case 'Escape':
				e.preventDefault();
				setIsOpen(false);
				setActiveIndex(-1);
				break;
			case 'Tab':
				setIsOpen(false);
				setActiveIndex(-1);
				break;
		}
	}

	function handleSelect(teamName: string) {
		onChange(teamName);
		setIsOpen(false);
		setActiveIndex(-1);
		inputRef.current?.blur();
	}

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		onChange(e.target.value);
		setIsOpen(true);
		setActiveIndex(-1);
	}

	function handleFocus() {
		if (value.length >= 2) {
			setIsOpen(true);
		}
	}

	return (
		<div className="space-y-1">
			{label && (
				<label htmlFor={inputId} className="block text-sm font-medium text-foreground-muted">
					{label}
				</label>
			)}

			<div className="relative">
				<div className="relative">
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none">
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
					<input
						ref={inputRef}
						id={inputId}
						type="text"
						value={value}
						onChange={handleInputChange}
						onFocus={handleFocus}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						disabled={disabled}
						role="combobox"
						aria-expanded={shouldShowDropdown}
						aria-haspopup="listbox"
						aria-controls={shouldShowDropdown ? listboxId : undefined}
						aria-activedescendant={
							activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
						}
						aria-autocomplete="list"
						className={`w-full pl-10 pr-3 py-2 bg-surface-2 border border-[color:var(--border-strong)] rounded-lg text-foreground
              placeholder-foreground-subtle transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50
              disabled:opacity-50 ${error ? 'border-red-500' : ''}`}
					/>
				</div>

				{shouldShowDropdown && (
					<div
						ref={dropdownRef}
						id={listboxId}
						role="listbox"
						className="absolute z-50 w-full mt-1 bg-surface-2 border border-[color:var(--border-strong)] rounded-lg shadow-xl max-h-60 overflow-auto"
					>
						{results.map((team, index) => (
							<div
								key={team.id}
								id={`${listboxId}-option-${index}`}
								role="option"
								aria-selected={index === activeIndex}
								onClick={() => handleSelect(team.name)}
								onMouseEnter={() => setActiveIndex(index)}
								className={`px-3 py-2 cursor-pointer transition-colors flex items-center gap-3 ${
									index === activeIndex ? 'bg-[var(--hover-overlay-strong)]' : 'hover:bg-[var(--hover-overlay-strong)]'
								}`}
							>
								<div className="flex-shrink-0 w-6 h-6 relative flex items-center justify-center">
									{team.badgeUrl ? (
										<Image
											src={team.badgeUrl}
											alt={`${team.name} badge`}
											width={24}
											height={24}
											className="object-contain rounded-sm"
											unoptimized
										/>
									) : (
										<Shield className="w-5 h-5 text-[color:var(--muted-icon)]" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-foreground font-medium truncate">{team.name}</div>
									<div className="text-xs text-foreground-muted truncate">
										{team.league} · {team.country}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{error && <p className="text-sm text-red-500">{error}</p>}
		</div>
	);
}
