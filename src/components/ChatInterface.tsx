
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, User } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { toast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  currentUser: any;
}

const ChatInterface = ({ currentUser }: ChatInterfaceProps) => {
  const { friends, messages, loading, sendMessage, unreadCounts, clearUnreadCount } = useChat();
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedFriend?.id]);

  const handleSelectFriend = (friend: any) => {
    setSelectedFriend(friend);
    clearUnreadCount(friend.id);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedFriend || sending) return;

    setSending(true);
    const { error } = await sendMessage(selectedFriend.id, messageText);
    
    if (error) {
      toast({ title: "Failed to send message", description: error, variant: "destructive" });
    } else {
      setMessageText("");
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white text-xl">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Friends List */}
      <div className="w-1/3 border-r border-gray-700">
        <Card className="h-full bg-gray-800/80 backdrop-blur-lg border-0 rounded-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Friends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-180px)]">
              {friends.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-sm">Add friends to start chatting!</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleSelectFriend(friend)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedFriend?.id === friend.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {friend.username?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center justify-between">
                            <span className="truncate">{friend.username}</span>
                            {(unreadCounts[friend.id] || 0) > 0 && (
                              <Badge className="bg-red-500 text-white text-xs ml-2 px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
                                {unreadCounts[friend.id]}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {messages[friend.id]?.length || 0} messages
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1">
        <Card className="h-full bg-gray-800/80 backdrop-blur-lg border-0 rounded-none">
          {selectedFriend ? (
            <>
              <CardHeader className="pb-3 border-b border-gray-700">
                <CardTitle className="text-white text-lg flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-bold">
                      {selectedFriend.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  {selectedFriend.username}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[calc(100vh-180px)]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {(messages[selectedFriend.id] || []).map((message, index) => (
                      <div
                        key={`${message.id}-${index}`}
                        className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_id === currentUser.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-100'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      disabled={sending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">Select a friend to start chatting</p>
                <p className="text-sm">Choose someone from your friends list</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatInterface;