import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getMatches, getUserById, getLastMessage, getChatId } from '@/lib/store';
import BottomNav from '@/components/BottomNav';
import { MessageCircle } from 'lucide-react';

export default function ChatList() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const matches = getMatches();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background safe-top pb-24">
      <div className="max-w-sm mx-auto px-6 pt-6">
        <h1 className="text-xl font-heading font-bold mb-6">Chats</h1>

        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-muted-foreground" />
            </div>
            <h2 className="text-lg font-heading font-bold mb-2">No matches yet</h2>
            <p className="text-sm text-muted-foreground">Start swiping to find your match!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map(matchId => {
              const matchUser = getUserById(matchId);
              if (!matchUser) return null;
              const chatId = getChatId(user.id, matchId);
              const lastMsg = getLastMessage(chatId);

              return (
                <button
                  key={matchId}
                  onClick={() => navigate(`/chat/${matchId}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition-colors text-left"
                >
                  {matchUser.photos[0] ? (
                    <img src={matchUser.photos[0]} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full gradient-coral flex items-center justify-center text-primary-foreground font-bold">
                      {matchUser.displayName[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{matchUser.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMsg ? lastMsg.text : 'Say hello! 👋'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
