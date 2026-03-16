import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders a div element', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild;
    expect(el?.tagName).toBe('DIV');
  });

  it('applies animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('animate-pulse');
  });

  it('applies rectangular variant by default', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('rounded-xl');
  });

  it('applies text variant', () => {
    const { container } = render(<Skeleton variant="text" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('h-4');
  });

  it('applies circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('rounded-full');
  });

  it('accepts custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-full" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('h-10');
    expect(el?.className).toContain('w-full');
  });
});
