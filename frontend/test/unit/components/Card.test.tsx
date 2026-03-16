import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('custom-class');
  });

  it('has default styling', () => {
    const { container } = render(<Card>Styled</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('card-glass');
  });

  it('applies hover styling when hover prop is true', () => {
    const { container } = render(<Card hover>Hoverable</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('cursor-pointer');
  });

  it('applies elevated variant with card-glow', () => {
    const { container } = render(<Card variant="elevated">Elevated</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('card-glow');
  });

  it('applies interactive variant with cursor-pointer', () => {
    const { container } = render(<Card variant="interactive">Interactive</Card>);
    const card = container.firstElementChild;
    expect(card?.className).toContain('cursor-pointer');
  });
});
