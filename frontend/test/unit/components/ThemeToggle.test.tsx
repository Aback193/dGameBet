import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockSetTheme = vi.fn();
let mockResolvedTheme: string | undefined = 'dark';

vi.mock('next-themes', () => ({
  useTheme: () => ({
    setTheme: mockSetTheme,
    resolvedTheme: mockResolvedTheme,
  }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          !['initial', 'animate', 'exit', 'transition', 'layoutId', 'whileInView', 'viewport'].includes(key)
        )
      );
      return <div ref={ref} {...filteredProps}>{children}</div>;
    }),
  },
}));

import { ThemeToggle } from '@/components/ui/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockResolvedTheme = 'dark';
  });

  it('renders a button element when mounted', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeDefined();
  });

  it('has correct aria-label in dark mode', () => {
    mockResolvedTheme = 'dark';
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
  });

  it('has correct aria-label in light mode', () => {
    mockResolvedTheme = 'light';
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
  });

  it('calls setTheme with light when in dark mode', () => {
    mockResolvedTheme = 'dark';
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme with dark when in light mode', () => {
    mockResolvedTheme = 'light';
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('renders with theme-aware border and hover classes', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('border');
  });
});
