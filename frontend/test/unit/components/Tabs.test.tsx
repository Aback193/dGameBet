import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('framer-motion', () => ({
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

import { Tabs } from '@/components/ui/Tabs';

const tabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3' },
];

describe('Tabs', () => {
  it('renders all tabs', () => {
    render(<Tabs layoutId="test" tabs={tabs} activeTab="tab1" onChange={() => {}} />);
    expect(screen.getByText('Tab 1')).toBeDefined();
    expect(screen.getByText('Tab 2')).toBeDefined();
    expect(screen.getByText('Tab 3')).toBeDefined();
  });

  it('marks active tab with aria-selected', () => {
    render(<Tabs layoutId="test" tabs={tabs} activeTab="tab2" onChange={() => {}} />);
    const activeTab = screen.getByText('Tab 2').closest('button');
    expect(activeTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('marks inactive tabs with aria-selected false', () => {
    render(<Tabs layoutId="test" tabs={tabs} activeTab="tab1" onChange={() => {}} />);
    const inactiveTab = screen.getByText('Tab 3').closest('button');
    expect(inactiveTab?.getAttribute('aria-selected')).toBe('false');
  });

  it('calls onChange when tab is clicked', () => {
    const onChange = vi.fn();
    render(<Tabs layoutId="test" tabs={tabs} activeTab="tab1" onChange={onChange} />);
    fireEvent.click(screen.getByText('Tab 2'));
    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('renders with tablist role', () => {
    render(<Tabs layoutId="test" tabs={tabs} activeTab="tab1" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeDefined();
  });

  it('renders tabs with tab role', () => {
    render(<Tabs layoutId="test" tabs={tabs} activeTab="tab1" onChange={() => {}} />);
    const tabElements = screen.getAllByRole('tab');
    expect(tabElements.length).toBe(3);
  });
});
