
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface ChatMessageValidatorProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const ChatMessageValidator = ({ onSendMessage, disabled }: ChatMessageValidatorProps) => {
  const [message, setMessage] = useState('');

  const validateMessage = (message: string): string | null => {
    if (!message.trim()) {
      return "Message cannot be empty";
    }
    
    if (message.length > 1000) {
      return "Message cannot exceed 1000 characters";
    }

    // Basic profanity filter (extend as needed)
    const profanityWords = ['spam', 'scam', 'hack', 'cheat'];
    const lowerMessage = message.toLowerCase();
    const containsProfanity = profanityWords.some(word => lowerMessage.includes(word));
    
    if (containsProfanity) {
      return "Message contains inappropriate content";
    }

    // Check for excessive caps
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.7 && message.length > 10) {
      return "Please avoid excessive use of capital letters";
    }

    // Check for spam patterns (repeated characters)
    if (/(.)\1{4,}/.test(message)) {
      return "Please avoid repeating characters excessively";
    }

    return null;
  };

  const handleSend = () => {
    const validationError = validateMessage(message);
    
    if (validationError) {
      toast({
        title: "Invalid Message",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    onSendMessage(message.trim());
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex space-x-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
        disabled={disabled}
        maxLength={1000}
        className="flex-1"
      />
      <div className="text-xs text-gray-500 self-end mb-2">
        {message.length}/1000
      </div>
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="px-4"
      >
        Send
      </Button>
    </div>
  );
};

export default ChatMessageValidator;
