
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ChatMessage = Tables<'chat_messages'>;
type Profile = Tables<'profiles'>;

export function useChat() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: ChatMessage[] }>({});
  const [loading, setLoading] = useState(true);
  const processedMessageIds = useRef(new Set<string>());

  useEffect(() => {
    if (user) {
      fetchFriends();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      // Get friends through friendships table
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

      // Extract friend profiles
      const friendProfiles: Profile[] = [];
      friendships?.forEach(friendship => {
        if (friendship.user1_id === user.id && friendship.user2) {
          friendProfiles.push(friendship.user2);
        } else if (friendship.user2_id === user.id && friendship.user1) {
          friendProfiles.push(friendship.user1);
        }
      });

      setFriends(friendProfiles);

      // Fetch messages for each friend
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

      // Mark messages as processed
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

      // Mark message as processed to avoid duplication
      processedMessageIds.current.add(data.id);

      return { error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      return { error: 'Failed to send message' };
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Prevent duplicate processing
          if (processedMessageIds.current.has(newMessage.id)) {
            return;
          }
          
          // Only update if the message involves the current user
          if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
            const otherUserId = newMessage.sender_id === user.id ? newMessage.receiver_id : newMessage.sender_id;
            
            processedMessageIds.current.add(newMessage.id);
            
            setMessages(prev => ({
              ...prev,
              [otherUserId]: [...(prev[otherUserId] || []), newMessage]
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    friends,
    messages,
    loading,
    sendMessage,
    refetch: fetchFriends
  };
}
