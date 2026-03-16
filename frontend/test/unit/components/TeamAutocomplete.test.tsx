import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { TeamData } from '@/types/team';

// Mock next/image
vi.mock('next/image', () => ({
	default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Create mock function
const mockUseTeamSearch = vi.fn();

// Mock useTeamSearch hook
vi.mock('@/hooks/useTeamSearch', () => ({
	useTeamSearch: () => mockUseTeamSearch(),
}));

// Import after mocks
import { TeamAutocomplete } from '@/components/ui/TeamAutocomplete';

const mockTeams: TeamData[] = [
	{
		id: '1',
		name: 'FC Barcelona',
		shortName: 'Barcelona',
		country: 'Spain',
		league: 'La Liga',
		badgeUrl: 'https://example.com/barcelona.png',
		keywords: 'Barça',
	},
	{
		id: '2',
		name: 'Manchester United',
		shortName: 'Man Utd',
		country: 'England',
		league: 'Premier League',
		badgeUrl: 'https://example.com/manutd.png',
		keywords: 'Red Devils',
	},
	{
		id: '3',
		name: 'Manchester City',
		shortName: 'Man City',
		country: 'England',
		league: 'Premier League',
		badgeUrl: 'https://example.com/mancity.png',
		keywords: 'Citizens',
	},
];

describe('TeamAutocomplete', () => {
	beforeEach(() => {
		mockUseTeamSearch.mockReturnValue([]);
	});

	it('renders label and input', () => {
		const onChange = vi.fn();
		render(<TeamAutocomplete label="Team A" value="" onChange={onChange} />);

		expect(screen.getByText('Team A')).toBeDefined();
		expect(screen.getByRole('combobox')).toBeDefined();
	});

	it('renders with placeholder', () => {
		const onChange = vi.fn();
		render(
			<TeamAutocomplete
				label="Team A"
				value=""
				onChange={onChange}
				placeholder="Select a team"
			/>,
		);

		expect(screen.getByPlaceholderText('Select a team')).toBeDefined();
	});

	it('shows error message', () => {
		const onChange = vi.fn();
		render(
			<TeamAutocomplete
				label="Team A"
				value=""
				onChange={onChange}
				error="This field is required"
			/>,
		);

		expect(screen.getByText('This field is required')).toBeDefined();
	});

	it('calls onChange when typing', async () => {
		const onChange = vi.fn();
		render(<TeamAutocomplete label="Team A" value="" onChange={onChange} />);

		const input = screen.getByRole('combobox');
		await userEvent.type(input, 'Barcelona');

		expect(onChange).toHaveBeenCalled();
	});

	it('shows dropdown when typing >= 2 chars and results exist', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');

		// Simulate typing "Ba" by changing the input value
		fireEvent.change(input, { target: { value: 'Ba' } });
		
		// Rerender with the new value to reflect the controlled component behavior
		rerender(<TeamAutocomplete label="Team A" value="Ba" onChange={onChange} />);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeDefined();
		});
	});

	it('does not show dropdown for query < 2 chars', () => {
		mockUseTeamSearch.mockReturnValue([]);
		const onChange = vi.fn();

		render(<TeamAutocomplete label="Team A" value="B" onChange={onChange} />);

		const input = screen.getByRole('combobox');
		fireEvent.focus(input);

		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('displays team badges in dropdown items', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'Barcelona' } });
		rerender(<TeamAutocomplete label="Team A" value="Barcelona" onChange={onChange} />);

		await waitFor(() => {
			const badge = screen.getByAltText('FC Barcelona badge');
			expect(badge).toBeDefined();
			expect(badge.getAttribute('src')).toBe('https://example.com/barcelona.png');
		});
	});

	it('selects item on click', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'Barcelona' } });
		rerender(<TeamAutocomplete label="Team A" value="Barcelona" onChange={onChange} />);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeDefined();
		});

		const option = screen.getByText('FC Barcelona');
		fireEvent.click(option);

		expect(onChange).toHaveBeenCalledWith('FC Barcelona');
	});

	it('navigates with ArrowDown key', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'Man' } });
		rerender(<TeamAutocomplete label="Team A" value="Man" onChange={onChange} />);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeDefined();
		});

		fireEvent.keyDown(input, { key: 'ArrowDown' });

		const options = screen.getAllByRole('option');
		expect(options[0].getAttribute('aria-selected')).toBe('true');
	});

	it('navigates with ArrowUp key', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'Man' } });
		rerender(<TeamAutocomplete label="Team A" value="Man" onChange={onChange} />);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeDefined();
		});

		// Navigate down twice, then up once
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		fireEvent.keyDown(input, { key: 'ArrowDown' });
		fireEvent.keyDown(input, { key: 'ArrowUp' });

		const options = screen.getAllByRole('option');
		expect(options[0].getAttribute('aria-selected')).toBe('true');
	});

	it('selects item with Enter key', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'Barcelona' } });
		rerender(<TeamAutocomplete label="Team A" value="Barcelona" onChange={onChange} />);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeDefined();
		});

		fireEvent.keyDown(input, { key: 'ArrowDown' });
		fireEvent.keyDown(input, { key: 'Enter' });

		expect(onChange).toHaveBeenCalledWith('FC Barcelona');
	});

	it('closes dropdown with Escape key', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'Barcelona' } });
		rerender(<TeamAutocomplete label="Team A" value="Barcelona" onChange={onChange} />);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeDefined();
		});

		fireEvent.keyDown(input, { key: 'Escape' });

		await waitFor(() => {
			expect(screen.queryByRole('listbox')).toBeNull();
		});
	});

	it('closes dropdown on blur (outside click)', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<div>
				<TeamAutocomplete label="Team A" value="" onChange={onChange} />
				<button>Outside</button>
			</div>,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'Barcelona' } });
		
		rerender(
			<div>
				<TeamAutocomplete label="Team A" value="Barcelona" onChange={onChange} />
				<button>Outside</button>
			</div>,
		);

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeDefined();
		});

		const outsideButton = screen.getByText('Outside');
		fireEvent.mouseDown(outsideButton);

		await waitFor(() => {
			expect(screen.queryByRole('listbox')).toBeNull();
		});
	});

	it('accepts free-text input (no forced selection)', async () => {
		mockUseTeamSearch.mockReturnValue([]);
		const onChange = vi.fn();

		render(<TeamAutocomplete label="Team A" value="" onChange={onChange} />);

		const input = screen.getByRole('combobox');
		await userEvent.type(input, 'Custom Team Name');

		expect(onChange).toHaveBeenCalled();
		// Check that onChange was called with each character typed
		expect(onChange.mock.calls.length).toBeGreaterThan(0);
		// The input value should build up character by character
		const calls = onChange.mock.calls.map((call) => call[0]);
		expect(calls.join('')).toContain('Custom');
	});

	it('disables input when disabled prop is true', () => {
		const onChange = vi.fn();
		render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} disabled={true} />,
		);

		const input = screen.getByRole('combobox');
		expect(input).toHaveProperty('disabled', true);
	});

	it('has proper ARIA attributes', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');

		expect(input.getAttribute('aria-expanded')).toBe('false');
		expect(input.getAttribute('aria-haspopup')).toBe('listbox');
		expect(input.getAttribute('aria-autocomplete')).toBe('list');

		fireEvent.change(input, { target: { value: 'Barcelona' } });
		rerender(<TeamAutocomplete label="Team A" value="Barcelona" onChange={onChange} />);

		await waitFor(() => {
			expect(input.getAttribute('aria-expanded')).toBe('true');
			expect(input.getAttribute('aria-controls')).toBeTruthy();
		});
	});

	it('displays league and country for each team', async () => {
		mockUseTeamSearch.mockReturnValue(mockTeams);
		const onChange = vi.fn();

		const { rerender } = render(
			<TeamAutocomplete label="Team A" value="" onChange={onChange} />,
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'Man' } });
		rerender(<TeamAutocomplete label="Team A" value="Man" onChange={onChange} />);

		await waitFor(() => {
			const elements = screen.getAllByText(/Premier League · England/);
			expect(elements.length).toBeGreaterThan(0);
		});
	});
});
