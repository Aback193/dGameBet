import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner', () => {
  it('renders a spinner element', () => {
    const { container } = render(<Spinner />);
    expect(container.firstElementChild).toBeDefined();
  });

  it('renders with sm size', () => {
    const { container } = render(<Spinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('w-4');
  });

  it('renders with md size', () => {
    const { container } = render(<Spinner size="md" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('w-8');
  });

  it('renders with lg size', () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('w-12');
  });
});
