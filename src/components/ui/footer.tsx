import React from 'react';
import { useFooterText } from '@/hooks/useFooterText';

const Footer = () => {
  const { footerText, isLoading } = useFooterText();

  if (isLoading || !footerText.trim()) {
    return null;
  }

  return (
    <footer className="bg-background border-t border-border py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {footerText}
        </p>
      </div>
    </footer>
  );
};

export default Footer;