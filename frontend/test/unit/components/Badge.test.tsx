import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('applies success variant', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('green');
  });

  it('applies warning variant', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('yellow');
  });

  it('applies danger variant', () => {
    const { container } = render(<Badge variant="danger">Danger</Badge>);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('red');
  });

  it('applies default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstElementChild;
    expect(badge).toBeDefined();
  });
});
