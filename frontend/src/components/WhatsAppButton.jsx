import React from 'react';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '+233555861556';
const WHATSAPP_MESSAGE = 'Hello! I am interested in your web development services.';

export const WhatsAppButton = () => {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-button"
      data-testid="whatsapp-button"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle size={28} fill="white" />
    </a>
  );
};
