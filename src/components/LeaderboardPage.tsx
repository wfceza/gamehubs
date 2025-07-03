
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Crown, User, Star, Gamepad } from "lucide-react";

const LeaderboardPage = ({ currentUser }) => {
  // Mock leaderboard data
  const goldLeaderboard = [
    { rank: 1, username: "GoldMaster", gold: 2500, gamesPlayed: 45, wins: 38, isCurrentUser: false },
    { rank: 2, username: "CoinCollector", gold: 2200, gamesPlayed: 52, wins: 35, isCurrentUser: false },
    { rank: 3, username: "WealthyGamer", gold: 1900, gamesPlayed: 38, wins: 30, isCurrentUser: false },
    { rank: 4, username: "RichPlayer", gold: 1650, gamesPlayed: 41, wins: 28, isCurrentUser: false },
    { rank: 5, username: "MoneyMaker", gold: 1400, gamesPlayed: 35, wins: 25, isCurrentUser: false },
    { rank: 6, username: currentUser.username, gold: currentUser.gold, gamesPlayed: currentUser.gamesPlayed, wins: currentUser.wins, isCurrentUser: true },
    { rank: 7, username: "Player2", gold: 200, gamesPlayed: 15, wins: 8, isCurrentUser: false },
    { rank: 8, username: "GamerPro", gold: 350, gamesPlayed: 25, wins: 12, isCurrentUser: false },
    { rank: 9, username: "ChessNinja", gold: 450, gamesPlayed: 30, wins: 18, isCurrentUser: false },
    { rank: 10, username: "Rookie", gold: 85, gamesPlayed: 8, wins: 3, isCurrentUser: false }
  ].sort((a, b) => b.gold - a.gold).map((player, index) => ({ ...player, rank: index + 1 }));

  const winsLeaderboard = [...goldLeaderboard]
    .sort((a, b) => b.wins - a.wins)
    .map((player, index) => ({ ...player, rank: index + 1 }));

  const winRateLeaderboard = [...goldLeaderboard]
    .map(player => ({
      ...player,
      winRate: player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .map((player, index) => ({ ...player, rank: index + 1 }));

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-white font-bold text-lg">#{rank}</span>;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return "from-yellow-600/20 to-yellow-400/20 border-yellow-500/30";
      case 2: return "from-gray-500/20 to-gray-300/20 border-gray-400/30";
      case 3: return "from-amber-600/20 to-amber-400/20 border-amber-500/30";
      default: return "";
    }
  };

  const LeaderboardTable = ({ data, metric, metricLabel, showWinRate = false }) => (
    <div className="space-y-3">
      {data.map((player) => (
        <Card
          key={`${player.username}-${metric}`}
          className={`bg-white/10 border-white/20 backdrop-blur-lg transition-all hover:bg-white/15 ${
            player.isCurrentUser ? 'ring-2 ring-blue-500/50' : ''
          } ${player.rank <= 3 ? `bg-gradient-to-r ${getRankColor(player.rank)}` : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-full">
                  {getRankIcon(player.rank)}
                </div>
                
                <div className="flex items-center space-x-3">
                  <User className="w-8 h-8 text-white bg-white/20 rounded-full p-1" />
                  <div>
                    <h3 className={`font-semibold ${player.isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                      {player.username}
                      {player.isCurrentUser && <span className="ml-2 text-sm">(You)</span>}
                    </h3>
                    <p className="text-sm text-gray-300">
                      {player.gamesPlayed} games • {player.wins} wins
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  {metric === 'gold' && <Trophy className="w-5 h-5 text-yellow-400" />}
                  {metric === 'wins' && <Star className="w-5 h-5 text-green-400" />}
                  {metric === 'winRate' && <Gamepad className="w-5 h-5 text-purple-400" />}
                  <span className="text-2xl font-bold text-white">
                    {showWinRate ? `${player.winRate}%` : player[metric]}
                  </span>
                </div>
                <div className="text-sm text-gray-300">{metricLabel}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Leaderboard</h2>
        <p className="text-blue-200">See how you rank against other players</p>
      </div>

      {/* Current User Stats */}
      <Card className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/30 backdrop-blur-lg mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <User className="w-5 h-5 mr-2" />
            Your Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white/10 rounded-lg">
              <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                #{goldLeaderboard.find(p => p.isCurrentUser)?.rank || 'N/A'}
              </div>
              <div className="text-sm text-blue-200">Gold Ranking</div>
            </div>
            
            <div className="text-center p-4 bg-white/10 rounded-lg">
              <Star className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                #{winsLeaderboard.find(p => p.isCurrentUser)?.rank || 'N/A'}
              </div>
              <div className="text-sm text-blue-200">Wins Ranking</div>
            </div>
            
            <div className="text-center p-4 bg-white/10 rounded-lg">
              <Gamepad className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                #{winRateLeaderboard.find(p => p.isCurrentUser)?.rank || 'N/A'}
              </div>
              <div className="text-sm text-blue-200">Win Rate Ranking</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="gold" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 border-white/20 mb-6">
          <TabsTrigger value="gold" className="data-[state=active]:bg-white/20">
            <Trophy className="w-4 h-4 mr-2" />
            Gold
          </TabsTrigger>
          <TabsTrigger value="wins" className="data-[state=active]:bg-white/20">
            <Star className="w-4 h-4 mr-2" />
            Wins
          </TabsTrigger>
          <TabsTrigger value="winrate" className="data-[state=active]:bg-white/20">
            <Gamepad className="w-4 h-4 mr-2" />
            Win Rate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gold">
          <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white">Gold Leaderboard</CardTitle>
              <CardDescription className="text-blue-200">
                Players ranked by total Gold accumulated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable 
                data={goldLeaderboard} 
                metric="gold" 
                metricLabel="Gold" 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wins">
          <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white">Wins Leaderboard</CardTitle>
              <CardDescription className="text-blue-200">
                Players ranked by total number of wins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable 
                data={winsLeaderboard} 
                metric="wins" 
                metricLabel="Wins" 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="winrate">
          <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white">Win Rate Leaderboard</CardTitle>
              <CardDescription className="text-blue-200">
                Players ranked by win percentage (minimum 5 games)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable 
                data={winRateLeaderboard.filter(p => p.gamesPlayed >= 5)} 
                metric="winRate" 
                metricLabel="Win Rate"
                showWinRate={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaderboardPage;
