import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnderConstruction } from '@/components/shared/ui/UnderConstruction';

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'EN',
    setLanguage: () => {},
  }),
}));

describe('UnderConstruction', () => {
  it('renders the title from titleKey', () => {
    render(<UnderConstruction titleKey="nav_group" />);
    expect(screen.getByText('nav_group')).toBeInTheDocument();
  });

  it('renders the under construction description', () => {
    render(<UnderConstruction titleKey="nav_fanpage" />);
    expect(screen.getByText('under_construction_description')).toBeInTheDocument();
  });

  it('renders construction icon', () => {
    const { container } = render(<UnderConstruction titleKey="nav_group" />);
    const icon = container.querySelector('.lucide-construction');
    expect(icon).toBeInTheDocument();
  });
});

describe('GroupPage', () => {
  it('renders with nav_group title', () => {
    render(<UnderConstruction titleKey="nav_group" />);
    expect(screen.getByText('nav_group')).toBeInTheDocument();
  });
});

describe('FanpagePage', () => {
  it('renders with nav_fanpage title', () => {
    render(<UnderConstruction titleKey="nav_fanpage" />);
    expect(screen.getByText('nav_fanpage')).toBeInTheDocument();
  });
});
