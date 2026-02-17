
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

type ChatMessage = Tables<'chat_messages'>;
type Profile = Tables<'profiles'>;

export function useChat() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: ChatMessage[] }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const processedMessageIds = useRef(new Set<string>());
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchFriends();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          user1_id,
          user2_id,
          user1:profiles!friendships_user1_id_fkey(*),
          user2:profiles!friendships_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      const friendProfiles: Profile[] = [];
      friendships?.forEach(friendship => {
        if (friendship.user1_id === user.id && friendship.user2) {
          friendProfiles.push(friendship.user2);
        } else if (friendship.user2_id === user.id && friendship.user1) {
          friendProfiles.push(friendship.user1);
        }
      });

      setFriends(friendProfiles);

      for (const friend of friendProfiles) {
        await fetchMessagesWithFriend(friend.id);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessagesWithFriend = async (friendId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(prev => ({
        ...prev,
        [friendId]: data || []
      }));

      data?.forEach(message => {
        processedMessageIds.current.add(message.id);
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (receiverId: string, content: string, messageType: 'text' | 'voice' | 'image' = 'text') => {
    if (!user || !content.trim()) return { error: 'Invalid message' };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: content.trim(),
          message_type: messageType
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return { error: error.message };
      }

      // Mark as processed and immediately add to local state
      processedMessageIds.current.add(data.id);
      setMessages(prev => ({
        ...prev,
        [receiverId]: [...(prev[receiverId] || []), data]
      }));

      return { error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      return { error: 'Failed to send message' };
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return () => {};

    const channel = supabase
      .channel('chat_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          if (processedMessageIds.current.has(newMessage.id)) return;
          
          if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
            const otherUserId = newMessage.sender_id === user.id ? newMessage.receiver_id : newMessage.sender_id;
            
            processedMessageIds.current.add(newMessage.id);
            
            setMessages(prev => ({
              ...prev,
              [otherUserId]: [...(prev[otherUserId] || []), newMessage]
            }));

            // Show toast notification for incoming messages
            if (newMessage.sender_id !== user.id) {
              // Increment unread count
              setUnreadCounts(prev => ({
                ...prev,
                [newMessage.sender_id]: (prev[newMessage.sender_id] || 0) + 1
              }));

              // Find sender name from friends
              const senderFriend = friends.find(f => f.id === newMessage.sender_id);
              toast({
                title: `💬 ${senderFriend?.username || 'Friend'}`,
                description: newMessage.content?.substring(0, 50) || 'Sent a message',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Re-setup subscription when friends list changes (to get names for notifications)
  useEffect(() => {
    if (!user || friends.length === 0) return;
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [user, friends]);

  const clearUnreadCount = useCallback((friendId: string) => {
    setUnreadCounts(prev => ({ ...prev, [friendId]: 0 }));
  }, []);

  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return {
    friends,
    messages,
    loading,
    sendMessage,
    unreadCounts,
    totalUnreadCount,
    clearUnreadCount,
    refetch: fetchFriends
  };
}